import * as XLSX from "xlsx";

export interface ExtractedUser {
  full_name: string;
  email: string;
  phone?: string;
  national_id?: string;
  gender?: string;
  cadre?: string; // maps to "role" in the practitioners payload
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

export interface SelfOnboardingFormState {
  facility_name: string;
  sub_county: string;
  service_units: string;
  users_input_mode: "paste" | "upload";
  users_text: string;
  users_file: File | null;
  extracted_users: ExtractedUser[];
  total_users: number;
  extract_error: string | null;
}

export const HEALTHCARE_SHEET = "Healthcare Practitioners";
export const MAX_PREVIEW = 10;

export function getInitialState(
  extra?: Record<string, unknown> | null,
): SelfOnboardingFormState {
  return {
    facility_name: (extra?.facility_name as string) ?? "",
    sub_county: (extra?.sub_county as string) ?? "",
    service_units: (extra?.service_units as string) ?? "",
    users_input_mode: "paste",
    users_text: "",
    users_file: null,
    extracted_users: [],
    total_users: 0,
    extract_error: null,
  };
}

export function isValid(
  state: SelfOnboardingFormState,
  isUpdate: boolean,
): boolean {
  if (!state.facility_name.trim()) return false;
  if (isUpdate) return true;
  if (state.users_input_mode === "paste")
    return state.users_text.trim().length > 0;
  return (
    !!state.users_file &&
    !state.extract_error &&
    state.extracted_users.length > 0
  );
}

export function buildExtra(
  state: SelfOnboardingFormState,
): Record<string, unknown> {
  const name = state.facility_name.trim();

  // service_units is just a raw string here — AI will expand into full objects on submit
  const service_units = state.service_units
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  return {
    facility: {
      search_term: name.split(" ")[0],
      select_text: name,
      abbreviation: name.slice(0, 3),
    },
    warehouse_name: "Main Pharmacy",
    practitioners: [], // always overwritten by AI on submit
    service_units, // always overwritten by AI on submit
    laboratories: [{ name: "Main Lab", warehouse: "Main Pharmacy" }],
    facility_settings: {
      default_warehouse: "Main Pharmacy",
      county: null,
      sub_county: state.sub_county.trim() || null,
      walk_in_practitioner: null,
      walk_in_service_unit: "OPD",
      farewell_service_unit: null,
      default_processing_lab: "Main Lab",
    },
  };
}

export async function extractUsers(
  file: File,
): Promise<{ users: ExtractedUser[]; total: number; error: string | null }> {
  try {
    const wb = XLSX.read(await file.arrayBuffer());

    const sheetName = wb.SheetNames.find(
      (n) => n.trim().toLowerCase() === HEALTHCARE_SHEET.toLowerCase(),
    );
    if (!sheetName) {
      return {
        users: [],
        total: 0,
        error: `Sheet "${HEALTHCARE_SHEET}" not found. Found: ${wb.SheetNames.join(", ")}`,
      };
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
    });
    const heads = rows[2] as string[]; // row 3 = real headers
    const data = rows.slice(3) as unknown[][];

    if (!heads?.length || !data.length) {
      return { users: [], total: 0, error: "No data found in sheet." };
    }

    const col = (...keys: string[]) =>
      heads.findIndex((h) =>
        keys.some((k) =>
          String(h ?? "")
            .toLowerCase()
            .includes(k),
        ),
      );

    const iName = col("full name", "name");
    const iEmail = col("email");
    const iCadre = col("cadre");
    const iPhone = col("phone");
    const iNatId = col("national id", "id number", "national_id");
    const iGender = col("gender");

    const str = (r: unknown[], i: number) =>
      i >= 0 ? String(r[i] ?? "").trim() : "";

    // Valid: must have name AND email AND phone — all three required
    const valid = data.filter((r) => {
      const hasName = iName >= 0 && str(r, iName).length > 0;
      const hasEmail = iEmail >= 0 && str(r, iEmail).length > 0;
      const hasPhone = iPhone >= 0 && str(r, iPhone).length > 0;
      return hasName && hasEmail && hasPhone;
    });

    if (!valid.length)
      return {
        users: [],
        total: 0,
        error:
          "No valid user rows found. Each row must have a name, email, and phone number.",
      };

    const preview = valid.slice(0, MAX_PREVIEW).map((r) => ({
      full_name: str(r, iName),
      email: str(r, iEmail),
      ...(str(r, iCadre) && { cadre: str(r, iCadre) }),
      ...(str(r, iPhone) && { phone: str(r, iPhone) }),
      ...(str(r, iNatId) && { national_id: str(r, iNatId) }),
      ...(str(r, iGender) && { gender: str(r, iGender) }),
    }));

    return { users: preview, total: valid.length, error: null };
  } catch {
    return {
      users: [],
      total: 0,
      error: "Failed to read file. Must be a valid .xlsx or .csv.",
    };
  }
}
