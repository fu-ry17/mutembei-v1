import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  Workflow,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
} from "@/features/workflows/types";

export type WorkflowModalMode = "create" | "update";

interface ModalState {
  title: string;
  description: string;
}

function getInitialState(
  mode: WorkflowModalMode,
  editing?: Workflow | null,
): ModalState {
  if (mode === "update" && editing) {
    return { title: editing.title, description: editing.description ?? "" };
  }
  return { title: "", description: "" };
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WorkflowModalProps {
  open: boolean;
  mode: WorkflowModalMode;
  editing?: Workflow | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateWorkflowPayload | UpdateWorkflowPayload) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkflowModal({
  open,
  mode,
  editing,
  isPending,
  onClose,
  onSubmit,
}: WorkflowModalProps) {
  const isUpdate = mode === "update";

  // key prop on parent remounts fresh on each open
  const [state, setState] = useState<ModalState>(() =>
    getInitialState(mode, editing),
  );
  const { title, description } = state;

  function set(patch: Partial<ModalState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function handleClose() {
    setState(getInitialState("create"));
    onClose();
  }

  function handleSubmit() {
    if (!title.trim()) return;
    if (isUpdate && editing) {
      const payload: UpdateWorkflowPayload = {
        id: editing.id,
        title: title.trim(),
      };
      if (description.trim()) payload.description = description.trim();
      onSubmit(payload);
    } else {
      const payload: CreateWorkflowPayload = { title: title.trim() };
      if (description.trim()) payload.description = description.trim();
      onSubmit(payload);
    }
  }

  const canSubmit = title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">
            {isUpdate ? `Update "${editing?.title}"` : "New Workflow"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isUpdate
              ? "Update the workflow name or description."
              : "Give your workflow a name to get started."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="wf-title" className="text-sm">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wf-title"
              className="h-10"
              placeholder="e.g. Patient Onboarding"
              value={title}
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) =>
                e.key === "Enter" && canSubmit && !isPending && handleSubmit()
              }
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="wf-description" className="text-sm">
              Description
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </Label>
            <Textarea
              id="wf-description"
              className="min-h-[90px] resize-none text-sm"
              placeholder="What does this workflow do?"
              value={description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
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
                "Create Workflow"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
