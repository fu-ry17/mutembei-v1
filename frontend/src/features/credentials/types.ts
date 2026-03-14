// ── Credential types ──────────────────────────────────────────────────────────

export type CredentialType = "facility_setup" | "ai_key";

export interface Credential {
  id: string;
  title: string;
  credential_type: CredentialType;
  encrypted_data: string;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface CredentialsResponse {
  data: Credential[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCredentialPayload {
  title: string;
  credential_type: CredentialType;
  encrypted_data: string;
  extra?: Record<string, unknown>;
}

export interface UpdateCredentialPayload {
  id: string;
  title?: string;
  encrypted_data?: string;
  extra?: Record<string, unknown>;
}
