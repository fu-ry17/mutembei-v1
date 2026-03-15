import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CREDENTIAL_DEFS } from "../config";
import {
  getInitialModalState,
  buildCreatePayload,
  buildUpdatePayload,
} from "../lib";
import type { ModalMode } from "../config";
import type {
  Credential,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  CredentialType,
} from "../types";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 h-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export interface CredentialModalProps {
  open: boolean;
  mode: ModalMode;
  editingCred?: Credential | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateCredentialPayload | UpdateCredentialPayload,
  ) => void;
}

export function CredentialModal({
  open,
  mode,
  editingCred,
  isPending,
  onClose,
  onSubmit,
}: CredentialModalProps) {
  const isUpdate = mode === "update";
  const [state, setState] = useState(() =>
    getInitialModalState(mode, editingCred),
  );
  const { step, selectedType, title, fields, extraFields } = state;

  function set(patch: Partial<typeof state>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  // Parent passes a key that changes on each open — remounts with correct initial state

  const def = CREDENTIAL_DEFS.find((d) => d.type === selectedType);

  function handleClose() {
    setState(getInitialModalState("create-type"));
    onClose();
  }

  function handleSubmit() {
    if (!def || !title.trim()) return;
    if (isUpdate && editingCred) {
      onSubmit(
        buildUpdatePayload(editingCred.id, title, def, fields, extraFields),
      );
    } else {
      onSubmit(
        buildCreatePayload(
          title,
          selectedType as CredentialType,
          fields,
          extraFields,
        ),
      );
    }
  }

  const canSubmit = isUpdate
    ? title.trim().length > 0
    : def &&
      title.trim() &&
      def.fields.filter((f) => f.required).every((f) => fields[f.key]?.trim());

  const titleText = isUpdate
    ? `Update "${editingCred?.title}"`
    : step === "type"
      ? "New Credential"
      : `New ${def?.label}`;
  const descText = isUpdate
    ? "Only the name is required. Leave credential fields blank to keep existing values."
    : step === "type"
      ? "Choose the type of credential you want to store."
      : def?.description;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-115">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{titleText}</DialogTitle>
          <DialogDescription className="text-sm">{descText}</DialogDescription>
        </DialogHeader>

        {/* Step 1 — pick type */}
        {step === "type" && !isUpdate && (
          <div className="flex flex-col gap-2.5 pt-1">
            {CREDENTIAL_DEFS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.type}
                  onClick={() => set({ selectedType: d.type, step: "form" })}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left group"
                >
                  <div
                    className={cn(
                      "size-10 rounded-lg flex items-center justify-center shrink-0",
                      d.iconClass,
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {d.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.description}
                    </p>
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-lg leading-none">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2 — fill form */}
        {(step === "form" || isUpdate) && def && (
          <div className="flex flex-col gap-5 pt-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cred-title" className="text-sm">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cred-title"
                className="h-10"
                placeholder={
                  def.type === "facility_setup"
                    ? "e.g. Facility Login"
                    : "e.g. Gemini Production Key"
                }
                value={title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} className="text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Credentials{" "}
                  {isUpdate && (
                    <span className="normal-case font-normal">
                      (leave blank to keep current)
                    </span>
                  )}
                </p>
              </div>
              {def.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-2">
                  <Label htmlFor={f.key} className="text-sm">
                    {f.label}
                    {f.required && !isUpdate && (
                      <span className="text-destructive ml-0.5">*</span>
                    )}
                  </Label>
                  {f.type === "password" ? (
                    <PasswordInput
                      id={f.key}
                      value={fields[f.key] ?? ""}
                      onChange={(v) =>
                        set({ fields: { ...fields, [f.key]: v } })
                      }
                      placeholder={
                        isUpdate ? "Leave blank to keep current" : f.placeholder
                      }
                    />
                  ) : (
                    <Input
                      id={f.key}
                      type={f.type ?? "text"}
                      className="h-10"
                      placeholder={
                        isUpdate ? "Leave blank to keep current" : f.placeholder
                      }
                      value={fields[f.key] ?? ""}
                      onChange={(e) =>
                        set({ fields: { ...fields, [f.key]: e.target.value } })
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            {def.extraFields && def.extraFields.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Additional Info
                  </p>
                  {def.extraFields.map((f) => (
                    <div key={f.key} className="flex flex-col gap-2">
                      <Label htmlFor={`extra-${f.key}`} className="text-sm">
                        {f.label}
                        {f.required && !isUpdate && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                      </Label>
                      <Input
                        id={`extra-${f.key}`}
                        type={f.type ?? "text"}
                        className="h-10"
                        placeholder={
                          isUpdate
                            ? "Leave blank to keep current"
                            : f.placeholder
                        }
                        value={extraFields[f.key] ?? ""}
                        onChange={(e) =>
                          set({
                            extraFields: {
                              ...extraFields,
                              [f.key]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2.5 pt-1">
              {!isUpdate && (
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={() => set({ step: "type" })}
                  disabled={isPending}
                >
                  Back
                </Button>
              )}
              <Button
                className="flex-1 h-10"
                disabled={!canSubmit || isPending}
                onClick={handleSubmit}
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" /> Saving…
                  </>
                ) : isUpdate ? (
                  "Save Changes"
                ) : (
                  "Add Credential"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
