import { MoreVertical, Pencil, Trash2, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CREDENTIAL_DEFS } from "../config";
import { timeAgo } from "../lib";
import type { Credential } from "../types";

interface CredentialCardProps {
  cred: Credential;
  isDeleting: boolean;
  onEdit: (cred: Credential) => void;
  onDelete: (cred: Credential) => void;
}

export function CredentialCard({
  cred,
  isDeleting,
  onEdit,
  onDelete,
}: CredentialCardProps) {
  const def = CREDENTIAL_DEFS.find((d) => d.type === cred.credential_type)!;
  const Icon = def.icon;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors",
        isDeleting && "opacity-50 pointer-events-none",
      )}
    >
      <div
        className={cn(
          "size-9 rounded-lg flex items-center justify-center shrink-0",
          def.iconClass,
        )}
      >
        <Icon size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {cred.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={11} className="text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Added {timeAgo(cred.createdAt)}
          </p>
        </div>
      </div>

      <span
        className={cn(
          "hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0",
          def.badgeClass,
        )}
      >
        {def.label}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none">
            <MoreVertical size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-28">
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5"
            onClick={() => onEdit(cred)}
          >
            <Pencil size={11} className="mr-1.5" /> Update
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5 text-destructive focus:text-destructive"
            onClick={() => onDelete(cred)}
          >
            <Trash2 size={11} className="mr-1.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
