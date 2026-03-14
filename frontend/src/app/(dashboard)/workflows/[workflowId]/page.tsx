"use client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, GitBranch, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { JobsList } from "@/features/jobs/componets/job-list";
import { WorkflowModal } from "@/features/workflows/components/workflow-modal";
import { useDeleteWorkflow } from "@/features/workflows/hooks/use-delete-workflow";
import { useCreateUpdateWorkflow } from "@/features/workflows/hooks/user-create-update";
import { useGetWorkflow } from "@/features/workflows/hooks/user-workflow";
import type {
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
} from "@/features/workflows/types";

export default function WorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: workflow, isLoading, isError } = useGetWorkflow(workflowId!);
  const { mutate: saveWorkflow, isPending: isSaving } =
    useCreateUpdateWorkflow();
  const { mutate: deleteWorkflow, isPending: isDeleting } = useDeleteWorkflow();

  function handleSubmit(
    payload: CreateWorkflowPayload | UpdateWorkflowPayload,
  ) {
    saveWorkflow(payload, { onSuccess: () => setEditOpen(false) });
  }

  function handleDelete() {
    deleteWorkflow(workflowId!, { onSuccess: () => router.push("/workflows") });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button
        onClick={() => router.push("/workflows")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={12} /> Workflows
      </button>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : isError || !workflow ? (
        <div className="rounded-xl border border-border bg-card/50 py-20 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-foreground">
            Workflow not found
          </p>
          <p className="text-xs text-muted-foreground">
            It may have been deleted.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/workflows")}
          >
            Back to Workflows
          </Button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <GitBranch size={14} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground tracking-tight leading-tight truncate">
                  {workflow.title}
                </h1>
                {workflow.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
                    {workflow.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={11} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={11} />
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Jobs — fully self-contained with its own state, search, pagination */}
          <JobsList workflowId={workflow.id} />
        </>
      )}

      {/* Edit modal */}
      {workflow && (
        <WorkflowModal
          key={String(editOpen)}
          open={editOpen}
          mode="update"
          editing={workflow}
          isPending={isSaving}
          onClose={() => setEditOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{workflow?.title}"</strong> will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="mr-1.5 animate-spin" />{" "}
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
