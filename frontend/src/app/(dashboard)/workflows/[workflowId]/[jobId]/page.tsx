"use client";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Play,
  Trash2,
  AlertCircle,
  Rocket,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { getStatusConfig, getTypeConfig } from "@/features/jobs/config";
import {
  useCreateUpdateJob,
  useTriggerJob,
} from "@/features/jobs/hooks/use-create-update";
import { useDeleteJob } from "@/features/jobs/hooks/use-delete-job";
import { useGetJob } from "@/features/jobs/hooks/use-get-job";
import { Job, JOB_TYPES } from "@/features/jobs/types";

export default function JobDetailPage() {
  const { workflowId, jobId } = useParams<{
    workflowId: string;
    jobId: string;
  }>();
  const router = useRouter();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutate: save, isPending } = useCreateUpdateJob();

  const { data: job, isLoading, isError } = useGetJob(jobId!);
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteJob();
  const { mutate: triggerJob, isPending: isTriggering } = useTriggerJob();

  function handleDelete() {
    deleteJob(jobId!, {
      onSuccess: () => router.push(`/workflows/${workflowId}`),
    });
  }

  function handleTrigger() {
    triggerJob(jobId!);
  }

  const updateJobType = async () => {
    const { id, description, credential_id, error, extra, ...rest } =
      job as Job;
    save(
      {
        id,
        ...rest,
        type: JOB_TYPES[2],
        description: description ?? undefined,
      },
      {
        onSuccess: (data) => {
          triggerJob(data.id);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <button
          onClick={() => router.push(`/workflows/${workflowId}`)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={12} /> Jobs
        </button>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex flex-col gap-5">
        <button
          onClick={() => router.push(`/workflows/${workflowId}`)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={12} /> Jobs
        </button>
        <div className="rounded-xl border border-border bg-card/50 py-20 flex flex-col items-center gap-3 text-center">
          <AlertCircle size={20} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Job not found</p>
          <p className="text-xs text-muted-foreground">
            It may have been deleted.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/workflows/${workflowId}`)}
          >
            Back to Workflow
          </Button>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusConfig(job.status);
  const typeCfg = getTypeConfig(job.type);
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;
  const isBusy = isDeleting || isTriggering;
  const isTransient = ["running"].includes(job.status);
  const canDeploy =
    job.type === "self_onboarding" && job.status === "completed";
  const canRedeploy = job.type === "deployment";

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button
        onClick={() => router.push(`/workflows/${workflowId}`)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={12} /> Jobs
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <TypeIcon size={14} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground tracking-tight leading-tight truncate">
              {job.title}
            </h1>
            {job.description && (
              <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
                {job.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 gap-1.5 text-xs"
            disabled={isBusy || isTransient}
            onClick={handleTrigger}
          >
            {isTriggering ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Play size={11} />
            )}
            Trigger
          </Button>
          {canDeploy && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs"
              disabled={isBusy}
              onClick={updateJobType}
            >
              <Rocket size={11} />
              Deploy
            </Button>
          )}
          {canRedeploy && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs"
              disabled={isBusy}
              onClick={handleTrigger}
            >
              {isTriggering ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Rocket size={11} />
              )}
              Redeploy
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
            disabled={isBusy}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Status + Meta */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl border border-border bg-card">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Status
          </p>
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium w-fit px-2 py-0.5 rounded-full",
              statusCfg.className,
            )}
          >
            {isTransient ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <StatusIcon size={10} />
            )}
            <span className="capitalize">{statusCfg.label}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl border border-border bg-card">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Type
          </p>
          <p className="text-xs font-medium text-foreground capitalize">
            {typeCfg.label}
          </p>
        </div>
      </div>

      {/* Error */}
      {job.error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-destructive/20 bg-destructive/5">
          <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-destructive">Error</p>
            <p className="text-xs text-destructive/80 break-all font-mono">
              {job.error}
            </p>
          </div>
        </div>
      )}

      <div>Job Payload</div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{job.title}"</strong> will be permanently deleted. This
              cannot be undone.
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
