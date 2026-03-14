import { Globe, Cpu } from "lucide-react";
import type { CredentialType } from "./types";

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url" | "email";
  required?: boolean;
}

export interface CredentialDef {
  type: CredentialType;
  label: string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
  badgeClass: string;
  fields: FieldDef[];
  extraFields?: FieldDef[];
}

export type ModalMode = "create-type" | "create-form" | "update";

// ── Single source of truth for credential types ───────────────────────────────
// Add new credential types here — modal, cards, filters & payloads all derive from this.

export const CREDENTIAL_DEFS: CredentialDef[] = [
  {
    type: "facility_setup",
    label: "Facility Setup",
    description: "Website login credentials for a facility",
    icon: Globe,
    iconClass: "bg-muted text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
    fields: [
      {
        key: "email",
        label: "Email",
        placeholder: "brian@tiberbu.com",
        type: "email",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        placeholder: "••••••••",
        type: "password",
        required: true,
      },
    ],
    extraFields: [
      {
        key: "url",
        label: "Login URL",
        placeholder: "https://deploy.tiberbu.health/#/login",
        type: "url",
        required: true,
      },
    ],
  },
  {
    type: "ai_key",
    label: "AI API Key",
    description: "API key for an AI service (Gemini, OpenAI, etc.)",
    icon: Cpu,
    iconClass: "bg-muted text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "AIzaSy...",
        type: "password",
        required: true,
      },
    ],
    extraFields: [
      {
        key: "provider",
        label: "Provider",
        placeholder: "e.g. Gemini, OpenAI",
        type: "text",
        required: false,
      },
    ],
  },
];
