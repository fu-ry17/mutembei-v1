"use client";
import { useState } from "react";
import { Plus, KeyRound, Loader2 } from "lucide-react";
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
import { CredentialModal } from "@/features/credentials/components/credential-modal";
import { CREDENTIAL_DEFS } from "@/features/credentials/config";
import type { ModalMode } from "@/features/credentials/config";
import { useDeleteCredential } from "@/features/credentials/hooks/use-delete-creds";
import type {
  Credential,
  CredentialType,
  CreateCredentialPayload,
  UpdateCredentialPayload,
} from "@/features/credentials/types";
import { useTableParams } from "@/hooks/use-table-params";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/search-input";
import { FilterTabs } from "@/components/filter-tabs";
import { Pagination } from "@/components/pagination";
import type { FilterTab } from "@/components/filter-tabs";
import { CredentialCard } from "@/features/credentials/components/credential-card";
import { useCreateUpdateCredential } from "@/features/credentials/hooks/use-create-update-creds";
import { useGetCredentials } from "@/features/credentials/hooks/use-get-credentials";

export const CredentialsClient = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create-type");
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);

  const { search, page, limit, filter, setSearch, setPage, setFilter } =
    useTableParams<CredentialType>({ filterKey: "type", defaultLimit: 10 });

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useGetCredentials({
    page,
    limit,
    search: debouncedSearch,
    credential_type: filter === "all" ? undefined : filter,
  });

  const { mutate: saveCredential, isPending: isSaving } =
    useCreateUpdateCredential();
  const {
    mutate: deleteCredential,
    isPending: isDeleting,
    variables: deletingId,
  } = useDeleteCredential();

  const credentials = data?.data ?? [];
  const total = data?.total ?? 0;

  const filterTabs: FilterTab<CredentialType>[] = [
    { value: "all", label: "All", count: total },
    ...CREDENTIAL_DEFS.map((def) => ({
      value: def.type,
      label: def.label,
      count: credentials.filter((c) => c.credential_type === def.type).length,
    })),
  ];

  function openCreate() {
    setModalMode("create-type");
    setEditingCred(null);
    setModalOpen(true);
  }

  function openEdit(cred: Credential) {
    setModalMode("update");
    setEditingCred(cred);
    setModalOpen(true);
  }

  function handleSubmit(
    payload: CreateCredentialPayload | UpdateCredentialPayload,
  ) {
    saveCredential(payload, { onSuccess: () => setModalOpen(false) });
  }

  function handleDelete(id: string) {
    deleteCredential(id, { onSuccess: () => setDeleteTarget(null) });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Credentials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Securely store and manage credentials used by your workflows.
          </p>
        </div>
        <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={openCreate}>
          <Plus size={13} />
          <span className="hidden sm:inline">New Credential</span>
        </Button>
      </div>

      {/* Stats — Total first, then per-type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <KeyRound size={15} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">
              {total}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
        </div>
        {CREDENTIAL_DEFS.map((def) => {
          const Icon = def.icon;
          const count = credentials.filter(
            (c) => c.credential_type === def.type,
          ).length;
          return (
            <div
              key={def.type}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0",
                  def.iconClass,
                )}
              >
                <Icon size={15} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">
                  {count}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {def.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-4 pb-4 justify-end">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search.."
            className="w-full max-w-xs"
          />
        </div>
        <FilterTabs tabs={filterTabs} active={filter} onChange={setFilter} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card/50 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-foreground">
            Failed to load credentials
          </p>
          <p className="text-xs text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
      ) : credentials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center">
            <KeyRound size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {search ? "No results found" : "No credentials yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {search
                ? `No credentials match "${search}". Try a different search.`
                : "Add a credential to securely store login details or API keys for use in workflows."}
            </p>
          </div>
          {!search && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5"
              onClick={openCreate}
            >
              <Plus size={13} /> Add Credential
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {credentials.map((cred) => (
            <CredentialCard
              key={cred.id}
              cred={cred}
              isDeleting={isDeleting && deletingId === cred.id}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      {/* Modal */}
      <CredentialModal
        key={String(modalOpen) + (editingCred?.id ?? "new")}
        open={modalOpen}
        mode={modalMode}
        editingCred={editingCred}
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
            <AlertDialogTitle>Delete credential?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.title}"</strong> will be permanently
              deleted. Any workflows using this credential will stop working.
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
};
