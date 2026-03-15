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
import { Separator } from "@/components/ui/separator";
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
import { useCreateUpdateJob } from "../../hooks/use-create-update";
import { toast } from "sonner";
import type { Job } from "../../types";
import { aiFormatExtra } from "../../actions/use-ai-format";

interface Props {
  workflowId: string;
  editing?: Job | null;
  onSuccess: () => void;
  onBack: () => void;
}

export function SelfOnboardingForm({
  workflowId,
  editing,
  onSuccess,
  onBack,
}: Props) {
  const isUpdate = !!editing;
  const fileRef = useRef<HTMLInputElement>(null);

  const [s, setS] = useState<SelfOnboardingFormState>(() =>
    getInitialState(editing?.extra as Record<string, unknown> | null),
  );
  const [desc, setDesc] = useState(editing?.description ?? "");
  const [credId, setCredId] = useState(editing?.credential_id ?? "");
  const [extracting, setExtracting] = useState(false);
  const [aiFormatting, setAiFormatting] = useState(false);

  const { mutate: save, isPending } = useCreateUpdateJob();

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
      status: editing?.status ?? "pending",
      extra,
      ...(desc.trim() && { description: desc.trim() }),
      ...(credId && credId !== "__none__" && { credential_id: credId }),
    };

    if (isUpdate && editing) {
      save({ id: editing.id, ...payload }, { onSuccess });
    } else {
      save({ workflow_id: workflowId, ...payload }, { onSuccess });
    }
  }

  const canSubmit =
    isValid(s, isUpdate) && !extracting && !isPending && !aiFormatting;

  return (
    <div className="flex flex-col gap-5">
      <Separator />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Onboarding Details
        </p>

        {/* Facility Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="facility-name" className="text-sm">
            Facility Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="facility-name"
            className="h-10"
            placeholder="e.g. Lamu County Referal"
            value={s.facility_name}
            onChange={(e) => patch({ facility_name: e.target.value })}
          />
        </div>

        {/* Sub County */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-county" className="text-sm">
            Sub County{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="sub-county"
            className="h-10"
            placeholder="e.g Lamu East"
            value={s.sub_county}
            onChange={(e) => patch({ sub_county: e.target.value })}
          />
        </div>

        {/* Service Units */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="service-units" className="text-sm">
            Service Units <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="service-units"
            className="min-h-[60px] resize-none text-sm"
            placeholder="OPD:3, MCH, Maternity:5, Male Ward:15, Eye Clinic"
            value={s.service_units}
            onChange={(e) => patch({ service_units: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            Separate with commas. Add :n to set consultation rooms (OPD) or bed
            capacity (wards).
          </p>
        </div>

        {/* Users */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              Users {!isUpdate && <span className="text-destructive">*</span>}
            </Label>
            {/* Paste / Upload toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
              {(["paste", "upload"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ users_input_mode: m })}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors capitalize",
                    s.users_input_mode === m
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground",
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

          {/* Paste */}
          {s.users_input_mode === "paste" && (
            <>
              <Textarea
                className="min-h-[90px] resize-none text-sm font-mono"
                placeholder={"email,name,role\njohn@example.com,John Doe,admin"}
                value={s.users_text}
                onChange={(e) => patch({ users_text: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                CSV — first row = headers (email, name, role…).
              </p>
            </>
          )}

          {/* Upload */}
          {s.users_input_mode === "upload" && (
            <>
              {s.users_file ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/40 min-w-0 overflow-hidden">
                  <FileSpreadsheet
                    size={15}
                    className="text-emerald-500 shrink-0"
                  />
                  <span className="flex-1 text-sm truncate min-w-0 max-w-[200px]">
                    {s.users_file.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                    {(s.users_file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-accent/40 transition-colors"
                >
                  <Upload size={16} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
                onChange={onFileChange}
              />

              {extracting && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" /> Reading sheet…
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
                  <div className="rounded-lg border border-border max-h-[160px] overflow-y-auto">
                    {s.extracted_users.map((u, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-xs",
                          i < s.extracted_users.length - 1 &&
                            "border-b border-border",
                        )}
                      >
                        <div className="size-5 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold uppercase">
                          {(u.full_name || u.email || "?").charAt(0)}
                        </div>
                        <span className="font-medium truncate flex-1">
                          {u.full_name || u.email || "—"}
                        </span>
                        {u.email && u.full_name && (
                          <span className="text-muted-foreground shrink-0 truncate max-w-[130px]">
                            {u.email}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <JobFormFooter
        description={desc}
        credential_id={credId}
        onDescriptionChange={setDesc}
        onCredentialChange={(v) => setCredId(v ?? "")}
      />

      <div className="flex gap-2.5 pt-1">
        <Button
          variant="outline"
          className="flex-1 h-10"
          onClick={onBack}
          disabled={isPending}
        >
          Back
        </Button>
        <Button
          className="flex-1 h-10"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {aiFormatting ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" /> Formatting…
            </>
          ) : isPending ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" /> Saving…
            </>
          ) : isUpdate ? (
            "Save Changes"
          ) : (
            "Create Job"
          )}
        </Button>
      </div>
    </div>
  );
}
