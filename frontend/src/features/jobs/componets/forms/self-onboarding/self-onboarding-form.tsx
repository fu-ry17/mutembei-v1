"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  ClipboardList,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { JobFormFooter } from "./form-fields";
import {
  getInitialState,
  isValid,
  buildExtra,
  extractUsers,
  HEALTHCARE_SHEET,
  MAX_PREVIEW,
  type SelfOnboardingFormState,
} from "./self-onboarding-utils";
import { useCreateUpdateJob } from "../../../hooks/use-create-update";
import { toast } from "sonner";
import { aiFormatExtra } from "../../../actions/use-ai-format";
import { useRouter } from "next/navigation";

interface Props {
  workflowId: string;
  type?: string;
}

export function SelfOnboardingForm({ workflowId, type }: Props) {
  const router = useRouter();
  const isUpdate = !!type;
  const fileRef = useRef<HTMLInputElement>(null);

  const [s, setS] = useState<SelfOnboardingFormState>(() =>
    getInitialState(null),
  );
  const [desc, setDesc] = useState("");
  const [credId, setCredId] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [aiFormatting, setAiFormatting] = useState(false);

  const { mutate: save, isPending } = useCreateUpdateJob();

  const busy = isPending || aiFormatting || extracting;

  function patch(p: Partial<SelfOnboardingFormState>) {
    setS((prev) => ({ ...prev, ...p }));
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    patch({
      users_file: file,
      extracted_users: [],
      total_users: 0,
      extract_error: null,
    });
    setExtracting(true);
    const { users, total, error } = await extractUsers(file);
    patch({ extracted_users: users, total_users: total, extract_error: error });
    setExtracting(false);
  }

  function clearFile() {
    patch({
      users_file: null,
      extracted_users: [],
      total_users: 0,
      extract_error: null,
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit() {
    if (!isValid(s, isUpdate)) return;
    let extra = buildExtra(s);

    const rawUsers =
      s.users_input_mode === "paste"
        ? s.users_text.trim()
        : s.extracted_users
            .map((u) =>
              [
                u.full_name,
                u.email,
                u.cadre ?? "",
                u.phone ?? "",
                u.national_id ?? "",
                u.gender ?? "",
              ].join(","),
            )
            .join("\n");

    setAiFormatting(true);
    try {
      const { practitioners, service_units, original_service_units } =
        await aiFormatExtra(rawUsers, s.service_units);
      extra = {
        ...extra,
        service_units,
        practitioners,
        original_service_units,
      };
    } catch {
      toast.error(
        "Failed to format job data. Please check your input and try again.",
      );
      setAiFormatting(false);
      return;
    }
    setAiFormatting(false);

    const payload = {
      title: s.facility_name.trim(),
      type: "self_onboarding" as const,
      status: "pending",
      extra,
      ...(desc.trim() && { description: desc.trim() }),
      ...(credId && credId !== "__none__" && { credential_id: credId }),
    };

    save(
      { workflow_id: workflowId, ...payload },
      {
        onSuccess: () => {
          router.push(`/workflows/${workflowId}`);
        },
      },
    );
  }

  const canSubmit =
    isValid(s, isUpdate) && !extracting && !isPending && !aiFormatting;

  return (
    <div className="flex flex-col gap-4">
      {/* Facility + Sub county */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="facility-name" className="text-sm">
            Facility name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="facility-name"
            className="h-9"
            placeholder="e.g. Lamu County Referral"
            disabled={busy}
            value={s.facility_name}
            onChange={(e) => patch({ facility_name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-county" className="text-sm">
            Sub county{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="sub-county"
            className="h-9"
            placeholder="e.g. Lamu East"
            disabled={busy}
            value={s.sub_county}
            onChange={(e) => patch({ sub_county: e.target.value })}
          />
        </div>
      </div>

      {/* Service Units */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="service-units" className="text-sm">
          Service units <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="service-units"
          className="min-h-[60px] resize-none text-sm"
          placeholder="OPD:3, MCH, Maternity:5, Male Ward:15, Eye Clinic"
          disabled={busy}
          value={s.service_units}
          onChange={(e) => patch({ service_units: e.target.value })}
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Comma-separated. Add :n for consultation rooms (OPD) or bed capacity
          (wards).
        </p>
      </div>

      {/* Users */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">
            Users {!isUpdate && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
            {(["paste", "upload"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={busy}
                onClick={() => patch({ users_input_mode: m })}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                  s.users_input_mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  busy && "opacity-50 cursor-not-allowed pointer-events-none",
                )}
              >
                {m === "paste" ? (
                  <ClipboardList size={11} />
                ) : (
                  <Upload size={11} />
                )}
                {m}
              </button>
            ))}
          </div>
        </div>

        {s.users_input_mode === "paste" && (
          <>
            <Textarea
              className="min-h-[90px] resize-none text-sm font-mono"
              placeholder={"email,name,role\njohn@example.com,John Doe,Nurse"}
              disabled={busy}
              value={s.users_text}
              onChange={(e) => patch({ users_text: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              CSV — first row = headers (email, name, role…).
            </p>
          </>
        )}

        {s.users_input_mode === "upload" && (
          <div className="flex flex-col gap-2">
            {s.users_file ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40">
                <FileSpreadsheet
                  size={14}
                  className="text-emerald-500 shrink-0"
                />
                <span className="flex-1 text-xs font-medium truncate min-w-0">
                  {s.users_file.name}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {(s.users_file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={clearFile}
                  className={cn(
                    "p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors",
                    busy && "opacity-50 cursor-not-allowed pointer-events-none",
                  )}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex flex-col items-center gap-2 px-4 py-6 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-accent/30 transition-all",
                  busy && "opacity-50 cursor-not-allowed pointer-events-none",
                )}
              >
                <Upload size={16} className="text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    .xlsx or .csv — needs "{HEALTHCARE_SHEET}" sheet
                  </p>
                </div>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              className="hidden"
              disabled={busy}
              onChange={onFileChange}
            />

            {extracting && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 size={11} className="animate-spin" /> Reading sheet…
              </div>
            )}

            {s.extract_error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle
                  size={13}
                  className="text-destructive shrink-0 mt-0.5"
                />
                <p className="text-xs text-destructive">{s.extract_error}</p>
              </div>
            )}

            {s.extracted_users.length > 0 && !s.extract_error && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Users size={11} className="text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">
                    Showing {s.extracted_users.length} of {s.total_users} user
                    {s.total_users !== 1 ? "s" : ""}
                    {s.total_users > MAX_PREVIEW && " (preview)"}
                  </p>
                </div>
                <div className="rounded-lg border border-border max-h-[150px] overflow-y-auto">
                  {s.extracted_users.map((u, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2",
                        i < s.extracted_users.length - 1 &&
                          "border-b border-border",
                      )}
                    >
                      <div className="size-[22px] rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-medium uppercase text-muted-foreground">
                        {(u.full_name || u.email || "?").charAt(0)}
                      </div>
                      <span className="text-xs font-medium flex-1 truncate">
                        {u.full_name || u.email || "—"}
                      </span>
                      {u.email && u.full_name && (
                        <span className="text-[11px] text-muted-foreground shrink-0 truncate max-w-[130px]">
                          {u.email}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <JobFormFooter
        type="facility_setup"
        description={desc}
        credential_id={credId}
        disabled={busy}
        onDescriptionChange={setDesc}
        onCredentialChange={(v) => setCredId(v ?? "")}
      />

      <div className="flex justify-end pt-1">
        <Button
          className="gap-2 p-5 text-white"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {aiFormatting ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Formatting…
            </>
          ) : isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Saving…
            </>
          ) : isUpdate ? (
            "Save changes"
          ) : (
            "Create job"
          )}
        </Button>
      </div>
    </div>
  );
}
