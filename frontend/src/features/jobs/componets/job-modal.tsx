import { useState } from "react";
import { useRouter } from "next/navigation";
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

export type JobModalMode = "create" | "update";
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
  const router = useRouter();
  const isUpdate = mode === "update";

  const handleClose = () => {
    onClose();
  };

  const selectType = (t: string) => {
    router.push(`/workflows/${workflowId}/create?type=${t}`);
    handleClose();
  };

  const titleText = isUpdate ? `Update "${editing?.title}"` : "New Job";
  const descText = isUpdate
    ? `Update this job.`
    : "Choose the type of job to add to this workflow.";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{titleText}</DialogTitle>
          <DialogDescription className="text-sm">{descText}</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
