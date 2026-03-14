import type {
  Credential,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  CredentialType,
} from "./types";
import type { CredentialDef, ModalMode } from "./config";
import { CREDENTIAL_DEFS } from "./config";

// ── Payload builders ──────────────────────────────────────────────────────────

export function buildCreatePayload(
  title: string,
  type: CredentialType,
  fields: Record<string, string>,
  extraFields: Record<string, string>,
): CreateCredentialPayload {
  const def = CREDENTIAL_DEFS.find((d) => d.type === type)!;
  const encryptedObj: Record<string, string> = {};
  def.fields.forEach(({ key }) => {
    if (fields[key]) encryptedObj[key] = fields[key];
  });
  const extra: Record<string, unknown> = {};
  def.extraFields?.forEach(({ key }) => {
    if (extraFields[key]) extra[key] = extraFields[key];
  });
  return {
    title,
    credential_type: type,
    encrypted_data: JSON.stringify(encryptedObj),
    extra,
  };
}

export function buildUpdatePayload(
  id: string,
  title: string,
  def: CredentialDef,
  fields: Record<string, string>,
  extraFields: Record<string, string>,
): UpdateCredentialPayload {
  const payload: UpdateCredentialPayload = { id, title };
  const encryptedObj: Record<string, string> = {};
  def.fields.forEach(({ key }) => {
    if (fields[key]?.trim()) encryptedObj[key] = fields[key];
  });
  if (Object.keys(encryptedObj).length > 0)
    payload.encrypted_data = JSON.stringify(encryptedObj);
  const extra: Record<string, unknown> = {};
  def.extraFields?.forEach(({ key }) => {
    if (extraFields[key]?.trim()) extra[key] = extraFields[key];
  });
  if (Object.keys(extra).length > 0) payload.extra = extra;
  return payload;
}

// ── Date helper ───────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Modal initial state ───────────────────────────────────────────────────────

export interface ModalState {
  step: "type" | "form";
  selectedType: CredentialType | "";
  title: string;
  fields: Record<string, string>;
  extraFields: Record<string, string>;
}

export function getInitialModalState(
  mode: ModalMode,
  editingCred?: Credential | null,
): ModalState {
  if (mode === "update" && editingCred) {
    const credDef = CREDENTIAL_DEFS.find(
      (d) => d.type === editingCred.credential_type,
    );
    const storedExtra: Record<string, string> = {};
    credDef?.extraFields?.forEach(({ key }) => {
      const val = editingCred.extra[key];
      if (val !== undefined) storedExtra[key] = String(val);
    });
    return {
      step: "form",
      selectedType: editingCred.credential_type,
      title: editingCred.title,
      fields: {}, // encrypted_data intentionally blank
      extraFields: storedExtra,
    };
  }
  return {
    step: "type",
    selectedType: "",
    title: "",
    fields: {},
    extraFields: {},
  };
}
