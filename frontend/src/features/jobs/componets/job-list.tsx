import { useState } from "react";
import {
  Zap,
  Plus,
  Loader2,
  Circle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { useTableParams } from "@/hooks/use-table-params";
import { useDebounce } from "@/hooks/use-debounce";
import { JobCard } from "./job-card";
import { JobModal } from "./job-modal";
import { useDeleteJob } from "../hooks/use-delete-job";
import { useTriggerJob } from "../hooks/use-create-update";
import { STATUS_CONFIG } from "../config";
import { JOB_STATUSES } from "../types";
import type { Job } from "../types";
import type { JobModalMode } from "./job-modal";
import { useGetJobs } from "../hooks/use-get-jobs";

interface JobsListProps {
  workflowId: string;
}

export function JobsList({ workflowId }: JobsListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<JobModalMode>("create");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const { search, page, limit, filter, setSearch, setPage, setFilter } =
    useTableParams<string>({ filterKey: "status", defaultLimit: 10 });

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useGetJobs({
    workflow_id: workflowId,
    status: filter === "all" ? undefined : filter,
    search: debouncedSearch,
    page,
    limit,
    sort: "created_at:desc",
  });

  const {
    mutate: deleteJob,
    isPending: isDeleting,
    variables: deletingId,
  } = useDeleteJob();
  const {
    mutate: triggerJob,
    isPending: isTriggering,
    variables: triggeringId,
  } = useTriggerJob();

  const jobs = data?.data ?? [];
  const total = data?.total ?? 0;

  const counts = {
    total,
    completed: jobs.filter((j) => j.status === "completed").length,
    pending: jobs.filter((j) => j.status === "pending").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  function openCreate() {
    setModalMode("create");
    setEditingJob(null);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Jobs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Steps that run as part of this workflow.
          </p>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={openCreate}>
          <Plus size={11} /> Add Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: Zap, label: "Total", value: counts.total },
          { icon: CheckCircle2, label: "Completed", value: counts.completed },
          { icon: Clock, label: "Pending", value: counts.pending },
          { icon: XCircle, label: "Failed", value: counts.failed },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
          >
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon size={14} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Status */}
      <div className="flex items-center gap-3 justify-end">
        <SearchInput
          key={search || "empty"}
          value={search}
          onChange={setSearch}
          placeholder="Search jobs…"
          className="w-full max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v)}>
          <SelectTrigger className="h-9 w-[160px] text-sm shrink-0">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {JOB_STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <Icon size={11} className="text-muted-foreground" />
                    {cfg.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card/50 py-12 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-foreground">
            Failed to load jobs
          </p>
          <p className="text-xs text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 py-12 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-1.5 opacity-20">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex items-center gap-1.5">
                <div className="size-7 rounded-lg bg-muted flex items-center justify-center">
                  <Circle size={12} className="text-muted-foreground" />
                </div>
                {i < 2 && <div className="w-4 h-px bg-border" />}
              </span>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {search
                ? "No results found"
                : filter !== "all"
                  ? `No ${filter} jobs`
                  : "No jobs yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {search
                ? `No jobs match "${search}".`
                : filter !== "all"
                  ? `No jobs with status "${filter}" in this workflow.`
                  : "Add your first job to define what this workflow does."}
            </p>
          </div>
          {!search && filter === "all" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs mt-1"
              onClick={openCreate}
            >
              <Plus size={11} /> Add First Job
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isDeleting={isDeleting && deletingId === job.id}
              isTriggering={isTriggering && triggeringId === job.id}
              onDelete={setDeleteTarget}
              onTrigger={(j) => triggerJob(j.id)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      {/* Modal — no isPending/onSubmit, each form owns its own mutation */}
      <JobModal
        key={String(modalOpen) + (editingJob?.id ?? "new")}
        open={modalOpen}
        mode={modalMode}
        workflowId={workflowId}
        editing={editingJob}
        onClose={() => setModalOpen(false)}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.title}"</strong> will be permanently
              deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() =>
                deleteTarget &&
                deleteJob(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                })
              }
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
