"use server";

import { GoogleGenAI } from "@google/genai";

const AI_CLIENT = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export interface ServicePoint {
  name: string;
  type: "Room";
  stage: number;
}

export interface ServiceUnit {
  name: string;
  type: "Outpatient" | "Inpatient";
  capacity: string;
  service_points: ServicePoint[];
  billing_amount?: string;
  service_categories: string[];
}

export interface Practitioner {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  national_id?: string;
  gender?: string;
  role?: string;
}

export interface AIFormatResult {
  practitioners: Practitioner[];
  service_units: ServiceUnit[];
  original_service_units: string[];
}

const BATCH_SIZE = 20;
const MAX_CONCURRENCY = 3;

const ALLOWED_ROLES = new Set([
  "Pharmacist Manager",
  "Pharmacist Admin",
  "Pharmacist",
  "Nurse",
  "Lab Technician",
  "HRIO",
  "Dispensary Nurse",
  "Physician",
]);

const PRACTITIONERS_PROMPT = `
You are a highly accurate data extraction assistant for a healthcare facility.
Return ONLY a JSON array. No markdown, no backticks, no explanations, no extra text.

For each practitioner in the input data, extract the following fields:

- name: Full name as-is. Do NOT split into first/last.
- email: Lowercase. Fix obvious typos:
    - Common domain typos (e.g., "gnail.com" → "gmail.com", "hotnail.com" → "hotmail.com", "yaho.com" → "yahoo.com").
    - Missing "@" (e.g., "johngmail.com" → "john@gmail.com").
    - Include as-is if unfixable.
- phone: Normalize to digits only and always include Kenyan country code:
    - If the number starts with "0", replace the leading "0" with "+254".
    - If the number starts with "254", prepend "+" if missing.
    - If the number already starts with "+254", leave as-is.
    - Remove all spaces, dashes, and parentheses.
- national_id: ID card number only. Omit if not present.
- gender: "Male" or "Female". Infer from first name if missing. Omit if cannot determine.
- role: Map the practitioner's cadre/title to exactly one of these case-sensitive values:
  "Pharmacist Manager", "Pharmacist Admin", "Pharmacist", "Nurse",
  "Lab Technician", "HRIO", "Dispensary Nurse", "Physician"
  Mapping rules (case-insensitive):
    - KRCHN / RN / registered nurse / nursing officer / enrolled nurse → Nurse
    - Dispensary Nurse / dispenser / dispensing nurse → Dispensary Nurse
    - MLT / medical lab / lab tech / laboratory technician → Lab Technician
    - HRIO / health records / health information officer → HRIO
    - Pharmacist Manager / pharmacy manager → Pharmacist Manager
    - Pharmacist Admin / pharmacy admin → Pharmacist Admin
    - Pharmacist / pharmaceutical technologist / pharm tech → Pharmacist
    - MO / medical officer / doctor / clinical officer / CO / KEPH / RCO / CHO / community health officer → Physician
    - Unknown or missing → Physician

Skip any entry that is missing BOTH email and phone.

Ensure:
- No additional fields are included.
- Output is a valid JSON array of objects.
- Do NOT add any formatting, comments, or text outside the JSON.
- Validate emails and phone numbers as best as possible, fixing obvious typos and normalizing formats.
`.trim();

const SERVICE_UNITS_PROMPT = `
You are a healthcare facility configuration assistant.
Return ONLY a raw JSON object. No markdown. No backticks. No explanation.

=== INPUT FORMAT ===
Units are comma-separated with optional number suffix after a colon:
- "OPD:3" → OPD with 3 consultation rooms
- "Male Ward:15" → Male Ward with capacity 15
- "OPD" → default 1 consultation room
- "Male Ward" → default capacity 10

=== RULES ===
- billing_amount is always "100"
- capacity: "1000" for Outpatient, "10" for Inpatient (overridden by suffix)
- Every service_point type is always "Room"
- type: "Inpatient" if name ends with "Ward", else "Outpatient"
- Inpatient: service_points:[], no billing_amount
- Outpatient: billing_amount:"100", first service_point is always Triage stage 1

=== SPECIAL: Maternity (:n suffix = ward capacity, default 10) ===
Expands into 4 units:
1. {"name":"Maternity","type":"Outpatient","capacity":"1000","service_points":[{"name":"Triage","type":"Room","stage":1},{"name":"Nursing Station","type":"Room","stage":2}],"billing_amount":"100","service_categories":[]}
2. {"name":"Labour Ward","type":"Inpatient","capacity":"<n>","service_points":[],"service_categories":["Female Ward"]}
3. {"name":"Antenatal Ward","type":"Inpatient","capacity":"<n>","service_points":[],"service_categories":["Female Ward"]}
4. {"name":"Postnatal Ward","type":"Inpatient","capacity":"<n>","service_points":[],"service_categories":["Female Ward"]}

=== FIXED OUTPATIENT DEFINITIONS ===
OPD (:n = consultation room count, default 1):
  service_points:[{"name":"Triage","type":"Room","stage":1}, {"name":"Consultation Room 1","type":"Room","stage":2}, ..., {"name":"Consultation Room n","type":"Room","stage":2}]
  service_categories:[]

MCH:
  service_points:[{"name":"Triage","type":"Room","stage":1},{"name":"CWC","type":"Room","stage":2},{"name":"PNC","type":"Room","stage":2},{"name":"FP","type":"Room","stage":2},{"name":"ANC","type":"Room","stage":2}]
  service_categories:["MCH"]

CCC:
  service_points:[{"name":"Triage","type":"Room","stage":1},{"name":"CCC Room","type":"Room","stage":2}]
  service_categories:[]

=== OUTPATIENT SERVICE POINTS (non-fixed units) ===
- Stage 1: always {"name":"Triage","type":"Room","stage":1}
- Stage 2: if name contains "Clinic" → use unit name as-is; else → "<UnitName> Room"

=== INPATIENT SERVICE CATEGORIES ===
- Male Ward → ["Male Ward"]
- Female Ward → ["Female Ward"]
- Labour/Antenatal/Postnatal Ward → ["Female Ward"]
- Paediatric Ward → ["Contains Cots","Contains Incubators"]
- Any other Ward → []
`.trim();

function splitName(
  name: string,
): Pick<Practitioner, "first_name" | "middle_name" | "last_name"> {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase());
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  if (parts.length === 2) return { first_name: parts[0], last_name: parts[1] };
  return {
    first_name: parts[0],
    middle_name: parts[1],
    last_name: parts.slice(2).join(" "),
  };
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s()-]/g, "");
  if (p.startsWith("0")) p = "+254" + p.slice(1);
  else if (p.startsWith("254")) p = "+254" + p.slice(3);
  else if (!p.startsWith("+254")) p = "+254" + p;
  return p;
}

type RawAIPractitioner = {
  name: string;
  email?: string;
  phone?: string;
  national_id?: string;
  gender?: string;
  role?: string;
};

function buildPractitioner(raw: RawAIPractitioner): Practitioner | null {
  if (!raw.email?.trim() && !raw.phone?.trim()) return null;
  return {
    ...splitName(raw.name),
    email: raw.email?.trim() ?? "",
    phone: raw.phone ? normalizePhone(raw.phone) : "",
    ...(raw.national_id && { national_id: raw.national_id }),
    ...(raw.gender && { gender: raw.gender }),
    role: ALLOWED_ROLES.has(raw.role ?? "") ? raw.role : "Physician",
  };
}

async function gemini(
  prompt: string,
  input: string,
  model: string,
): Promise<string> {
  const response = await AI_CLIENT.models.generateContent({
    model,
    contents: `${prompt}\n\n=== INPUT ===\n${input}\n\n=== OUTPUT ===`,
    config: { temperature: 0 },
  });
  return (response.text ?? "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function pLimit<T>(
  fns: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(fns.length);
  let i = 0;
  const worker = async () => {
    while (i < fns.length) {
      const j = i++;
      results[j] = await fns[j]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, fns.length) }, worker),
  );
  return results;
}

async function fetchServiceUnits(
  rawServiceUnits: string,
): Promise<ServiceUnit[]> {
  const json = await gemini(
    SERVICE_UNITS_PROMPT,
    rawServiceUnits,
    "gemini-2.5-flash",
  );
  const parsed = JSON.parse(json);
  const units: ServiceUnit[] = Array.isArray(parsed)
    ? parsed
    : (parsed.service_units ?? []);
  return units.map((su) => ({
    ...su,
    type: su.name.endsWith("Ward") ? "Inpatient" : "Outpatient",
    capacity: su.capacity ?? (su.name.endsWith("Ward") ? "10" : "1000"),
  }));
}

async function fetchPractitionerBatch(chunk: string): Promise<Practitioner[]> {
  const json = await gemini(
    PRACTITIONERS_PROMPT,
    chunk,
    "gemini-2.5-flash-lite",
  );
  const parsed = JSON.parse(json);
  const raw: RawAIPractitioner[] = Array.isArray(parsed)
    ? parsed
    : (parsed.practitioners ?? []);
  return raw
    .map(buildPractitioner)
    .filter((p): p is Practitioner => p !== null);
}

export async function aiFormatExtra(
  rawUsers: string,
  rawServiceUnits: string,
): Promise<AIFormatResult> {
  const lines = rawUsers
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  const chunks = Array.from(
    { length: Math.ceil(lines.length / BATCH_SIZE) },
    (_, i) => lines.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE).join("\n"),
  );

  const [service_units, ...batchResults] = await Promise.all([
    fetchServiceUnits(rawServiceUnits),
    ...(await pLimit(
      chunks.map((chunk) => () => fetchPractitionerBatch(chunk)),
      MAX_CONCURRENCY,
    )),
  ]);

  const seen = new Set<string>();
  const practitioners = batchResults.flat().filter((p) => {
    const key = p.email.toLowerCase();
    return seen.has(key) ? false : (seen.add(key), true);
  });

  return {
    practitioners,
    service_units,
    original_service_units: rawServiceUnits
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
