"use client";
import { useState } from "react";
import { Plus, GitBranch, Loader2 } from "lucide-react";
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
import { useTableParams } from "@/hooks/use-table-params";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import type {
  Workflow,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
} from "@/features/workflows/types";
import {
  type WorkflowModalMode,
  WorkflowModal,
} from "@/features/workflows/components/workflow-modal";
import { useDeleteWorkflow } from "@/features/workflows/hooks/use-delete-workflow";
import { useGetWorkflows } from "@/features/workflows/hooks/use-workflows";
import { useCreateUpdateWorkflow } from "@/features/workflows/hooks/user-create-update";
import { WorkflowCard } from "@/features/workflows/components/workflow-card";

export default function WorkflowClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<WorkflowModalMode>("create");
  const [editingWf, setEditingWf] = useState<Workflow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  // ── URL state ──────────────────────────────────────────────────────────────
  const { search, page, limit, setSearch, setPage } = useTableParams({
    defaultLimit: 10,
  });

  const debouncedSearch = useDebounce(search, 400);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useGetWorkflows({
    page,
    limit,
    search: debouncedSearch,
    sort: "created_at:desc",
  });

  const { mutate: saveWorkflow, isPending: isSaving } =
    useCreateUpdateWorkflow();
  const {
    mutate: deleteWorkflow,
    isPending: isDeleting,
    variables: deletingId,
  } = useDeleteWorkflow();

  const workflows = data?.data ?? [];
  const total = data?.total ?? 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setModalMode("create");
    setEditingWf(null);
    setModalOpen(true);
  }

  function openEdit(wf: Workflow) {
    setModalMode("update");
    setEditingWf(wf);
    setModalOpen(true);
  }

  function handleSubmit(
    payload: CreateWorkflowPayload | UpdateWorkflowPayload,
  ) {
    saveWorkflow(payload, { onSuccess: () => setModalOpen(false) });
  }

  function handleDelete(id: string) {
    deleteWorkflow(id, { onSuccess: () => setDeleteTarget(null) });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage automated workflows for your facilities.
          </p>
        </div>
        <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={openCreate}>
          <Plus size={13} />
          <span className="hidden sm:inline">New Workflow</span>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-end">
        <SearchInput
          key={search || "empty"}
          value={search}
          onChange={setSearch}
          placeholder="Search workflows…"
          className="w-full max-w-xs"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card/50 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-foreground">
            Failed to load workflows
          </p>
          <p className="text-xs text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center">
            <GitBranch size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {search ? "No results found" : "No workflows yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {search
                ? `No workflows match "${search}". Try a different search.`
                : "Create your first workflow to start automating tasks."}
            </p>
          </div>
          {!search && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5"
              onClick={openCreate}
            >
              <Plus size={13} /> New Workflow
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              isDeleting={isDeleting && deletingId === wf.id}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      {/* Modal — key remounts fresh state on every open */}
      <WorkflowModal
        key={String(modalOpen) + (editingWf?.id ?? "new")}
        open={modalOpen}
        mode={modalMode}
        editing={editingWf}
        isPending={isSaving}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
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
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
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
