// Entry point only — picks the type, then renders the matching form.
// Each form owns its own state + submit + mutation.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { JOB_TYPES } from "../types";
import { getTypeConfig } from "../config";
import type { Job } from "../types";
import { SelfOnboardingForm } from "./forms/self-onboarding-form";

export type JobModalMode = "create" | "update";
type ModalStep = "type" | "form";

export interface JobModalProps {
  open: boolean;
  mode: JobModalMode;
  workflowId: string;
  editing?: Job | null;
  onClose: () => void;
}

export function JobModal({
  open,
  mode,
  workflowId,
  editing,
  onClose,
}: JobModalProps) {
  const isUpdate = mode === "update";
  const [step, setStep] = useState<ModalStep>(isUpdate ? "form" : "type");
  const [selectedType, setSelectedType] = useState(editing?.type ?? "");

  const typeCfg = selectedType ? getTypeConfig(selectedType) : null;

  function handleClose() {
    if (!isUpdate) {
      setStep("type");
      setSelectedType("");
    }
    onClose();
  }

  function selectType(t: string) {
    setSelectedType(t);
    setStep("form");
  }

  const titleText = isUpdate
    ? `Update "${editing?.title}"`
    : step === "type"
      ? "New Job"
      : `New ${typeCfg?.label ?? ""} Job`;

  const descText = isUpdate
    ? `Update this ${typeCfg?.label ?? ""} job.`
    : step === "type"
      ? "Choose the type of job to add to this workflow."
      : `Configure your ${typeCfg?.label ?? ""} job.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{titleText}</DialogTitle>
          <DialogDescription className="text-sm">{descText}</DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Pick type ── */}
        {step === "type" && (
          <div className="flex flex-col gap-2.5 pt-1">
            {JOB_TYPES.map((t) => {
              const { label, icon: Icon } = getTypeConfig(t);
              return (
                <button
                  key={t}
                  onClick={() => selectType(t)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left group"
                >
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-muted-foreground" />
                  </div>
                  <p className="flex-1 text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-lg leading-none">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 2: Delegate to the matching form ── */}
        {step === "form" && selectedType === "self_onboarding" && (
          <SelfOnboardingForm
            workflowId={workflowId}
            editing={editing}
            onSuccess={handleClose}
            onBack={() => !isUpdate && setStep("type")}
          />
        )}

        {/* Adding a new type? Create forms/http-form.tsx and add:
            {step === "form" && selectedType === "http" && (
              <HttpForm workflowId={workflowId} editing={editing} onSuccess={handleClose} onBack={...} />
            )}
        */}
      </DialogContent>
    </Dialog>
  );
}
