import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
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

const ALLOWED_FIELDS = new Set([
  "first_name",
  "middle_name",
  "last_name",
  "email",
  "phone",
  "national_id",
  "gender",
  "role",
]);

function buildPrompt(rawUsers: string, rawServiceUnits: string): string {
  return `
You are a healthcare facility configuration assistant.
Return ONLY a raw JSON object. No markdown. No backticks. No explanation. No extra fields.

=== INPUT FORMAT FOR SERVICE UNITS ===
Units are comma-separated. Each unit can optionally include a number suffix after a colon:
- "OPD:3" → OPD with 3 consultation rooms
- "Male Ward:15" → Male Ward with capacity 15
- "Maternity:5" → Maternity expansion with capacity 5 on all wards
- "OPD" (no suffix) → OPD with default 1 consultation room
- "Male Ward" (no suffix) → Male Ward with default capacity 10

Parse the number suffix FIRST before applying any rules below.

=== SERVICE UNIT RULES (strict) ===
- billing_amount is always the string "100"
- capacity is always the string "1000" for Outpatient, "10" for Inpatient (unless overridden by suffix)
- Every service_point type is always exactly "Room"
- type is either "Outpatient" or "Inpatient" — never anything else

=== TYPE RULES ===
- Any unit whose name ends with "Ward" → type: "Inpatient"
- Inpatient units ALWAYS have: service_points:[], no billing_amount
- All other units → type: "Outpatient"
- Outpatient units ALWAYS have: billing_amount:"100", service_points starting with Triage stage 1

=== SPECIAL EXPANSIONS ===
If input contains "Maternity" (with optional :n suffix), expand into FOUR units:
  - n is the capacity for each ward (default 10 if not specified)
  1. {"name":"Maternity","type":"Outpatient","capacity":"1000","service_points":[{"name":"Triage","type":"Room","stage":1},{"name":"Nursing Station","type":"Room","stage":2}],"billing_amount":"100","service_categories":[]}
  2. {"name":"Labour Ward","type":"Inpatient","capacity":"<n>","service_points":[],"service_categories":["Female Ward"]}
  3. {"name":"Antenatal Ward","type":"Inpatient","capacity":"<n>","service_points":[],"service_categories":["Female Ward"]}
  4. {"name":"Postnatal Ward","type":"Inpatient","capacity":"<n>","service_points":[],"service_categories":["Female Ward"]}

=== FIXED OUTPATIENT DEFINITIONS — copy exactly, then apply suffix rules ===
OPD (with optional :n — n = number of consultation rooms, default 1):
  service_points:[
    {"name":"Triage","type":"Room","stage":1},
    {"name":"Consultation Room 1","type":"Room","stage":2},
    ... up to {"name":"Consultation Room n","type":"Room","stage":2}
  ]
  service_categories:[]
  (if n=1, use just "Consultation Room 1" NOT "Consultation Room")

MCH:
  service_points:[{"name":"Triage","type":"Room","stage":1},{"name":"CWC","type":"Room","stage":2},{"name":"PNC","type":"Room","stage":2},{"name":"FP","type":"Room","stage":2},{"name":"ANC","type":"Room","stage":2}]
  service_categories:["MCH"]

CCC:
  service_points:[{"name":"Triage","type":"Room","stage":1},{"name":"CCC Room","type":"Room","stage":2}]
  service_categories:[]

=== OUTPATIENT SERVICE POINT RULES (for all non-fixed units) ===
- First service_point is ALWAYS: {"name":"Triage","type":"Room","stage":1}
- If unit name contains "Clinic" → stage 2 name is the full unit name as-is
  e.g. "Eye Clinic" → {"name":"Eye Clinic","type":"Room","stage":2}
- All other Outpatient units → stage 2 name is "<UnitName> Room"
  e.g. "Pharmacy" → {"name":"Pharmacy Room","type":"Room","stage":2}
  (if name already ends with "Room", use as-is)

=== INPATIENT CAPACITY RULE ===
- Default capacity is "10"
- If unit has :n suffix, use that number as the capacity string e.g. "Male Ward:15" → capacity:"15"

=== INPATIENT SERVICE CATEGORY RULES ===
- Male Ward → service_categories:["Male Ward"]
- Female Ward → service_categories:["Female Ward"]
- Labour Ward, Antenatal Ward, Postnatal Ward → service_categories:["Female Ward"]
- Paediatric Ward → service_categories:["Contains Cots","Contains Incubators"]
- Any other Ward → service_categories:[]

=== PRACTITIONER RULES ===
- Split full name: first_name, middle_name (only if 3+ parts), last_name
- Title-case every name part: first letter uppercase, rest lowercase
- email: always lowercase
- Phone formatting (strict):
  * Already has +: keep as-is
  * Starts with 254: add + prefix → +254...
  * Starts with 0: replace leading 0 with +254 → 0711430224 → +254711430224
  * Otherwise: prepend +254
- Gender: always exactly "Male" or "Female"
  If missing or blank, infer from first_name using Kenyan/African name patterns:
  Alice, Mary, Jane, Ann, Grace, Mercy, Faith, Everline, Lenah → Female
  John, James, Peter, George, David, Brian, Robert → Male
- national_id: government-issued National ID card number ONLY — NOT staff_id or employee_id
- Allowed fields ONLY: first_name, middle_name, last_name, email, phone, national_id, gender, role
- Allowed roles (use EXACTLY as written, case-sensitive):
  "Pharmacist Manager", "Pharmacist Admin", "Pharmacist", "Nurse",
  "Lab Technician", "HRIO", "Dispensary Nurse", "Physician"
- Map cadres/titles to closest allowed role:
  KRCHN, RN, registered nurse, nursing officer, enrolled nurse → Nurse
  Dispensary Nurse, dispenser, dispensing nurse               → Dispensary Nurse
  MLT, medical lab, lab tech, laboratory technician           → Lab Technician
  HRIO, health records, health information officer            → HRIO
  Pharmacist Manager, pharmacy manager                        → Pharmacist Manager
  Pharmacist Admin, pharmacy admin                            → Pharmacist Admin
  Pharmacist, pharmaceutical technologist, pharm tech         → Pharmacist
  MO, medical officer, doctor, clinical officer, CO, KEPH,
  RCO, CHO, community health officer                          → Physician
- If role is unknown or missing → default to "Physician"
- CRITICAL: Only include a practitioner if they have BOTH email AND phone. Skip if either is missing.
- No data → return []

=== INPUT ===
SERVICE UNITS: ${rawServiceUnits || "(none)"}
PRACTITIONERS: ${rawUsers || "(none)"}

=== OUTPUT (nothing else) ===
{"practitioners":[...],"service_units":[...]}
`.trim();
}

export async function aiFormatExtra(
  rawUsers: string,
  rawServiceUnits: string,
): Promise<AIFormatResult> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(rawUsers, rawServiceUnits),
    config: { temperature: 0 },
  });

  const text = response.text?.trim() ?? "";
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(clean) as Omit<
    AIFormatResult,
    "original_service_units"
  >;

  // Post-parse enforcement — practitioners
  parsed.practitioners = parsed.practitioners
    .filter((p) => p.email?.trim() && p.phone?.trim())
    .map(
      (p) =>
        Object.fromEntries(
          Object.entries(p).filter(([k]) => ALLOWED_FIELDS.has(k)),
        ) as Practitioner,
    )
    .map((p) => ({
      ...p,
      role: ALLOWED_ROLES.has(p.role ?? "") ? p.role : "Physician",
    }));

  // Post-parse enforcement — service units
  parsed.service_units = parsed.service_units.map((su) => {
    const isWard = su.name.endsWith("Ward");
    return {
      ...su,
      type: isWard ? "Inpatient" : "Outpatient",
      capacity: su.capacity ?? (isWard ? "10" : "1000"),
    };
  });

  // Parse original_service_units from raw input
  const original_service_units = rawServiceUnits
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { ...parsed, original_service_units };
}
