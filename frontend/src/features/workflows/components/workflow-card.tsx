import {
  MoreVertical,
  Pencil,
  Trash2,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Workflow } from "../types";
import { useRouter } from "next/navigation";

interface WorkflowCardProps {
  workflow: Workflow;
  isDeleting: boolean;
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}

export function WorkflowCard({
  workflow,
  isDeleting,
  onEdit,
  onDelete,
}: WorkflowCardProps) {
  const router = useRouter();

  function handleView() {
    router.push(`/workflows/${workflow.id}`);
  }

  return (
    <div
      onClick={handleView}
      className={cn(
        "group flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        isDeleting && "opacity-50 pointer-events-none",
      )}
    >
      {/* Icon */}
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <GitBranch size={15} className="text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {workflow.title}
        </p>
        {workflow.description ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {workflow.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40 mt-0.5 italic">
            No description
          </p>
        )}
      </div>

      {/* Arrow hint */}
      <ArrowRight
        size={14}
        className="text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1"
      />

      {/* Dropdown — stopPropagation prevents card click from firing */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
          >
            <MoreVertical size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-28">
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
          >
            <ArrowRight size={11} className="mr-1.5" /> Open
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(workflow);
            }}
          >
            <Pencil size={11} className="mr-1.5" /> Update
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5 text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(workflow);
            }}
          >
            <Trash2 size={11} className="mr-1.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
