import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, Play, Loader2, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getStatusConfig, getTypeConfig } from "../config";
import type { Job } from "../types";
import { useJobStatus } from "../hooks/use-job-status";

interface JobCardProps {
  job: Job;
  isDeleting: boolean;
  isTriggering: boolean;
  onDelete: (job: Job) => void;
  onTrigger: (job: Job) => void;
}

export function JobCard({
  job,
  isDeleting,
  isTriggering,
  onDelete,
  onTrigger,
}: JobCardProps) {
  const router = useRouter();
  const statusCfg = getStatusConfig(job.status);
  const typeCfg = getTypeConfig(job.type);
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;
  const isBusy = isDeleting || isTriggering;
  useJobStatus(job.id);

  function handleView() {
    router.push(`/workflows/${job.workflow_id}/${job.id}`);
  }

  return (
    <div
      onClick={handleView}
      className={cn(
        "group flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        isBusy && "opacity-50 pointer-events-none",
      )}
    >
      {/* Type icon */}
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <TypeIcon size={15} className="text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {job.title}
          </p>
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium capitalize">
            {typeCfg.label}
          </span>
        </div>
        {job.description ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {job.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40 mt-0.5 italic">
            No description
          </p>
        )}
      </div>

      {/* Status badge */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0",
          statusCfg.className,
        )}
      >
        {job.status === "running" ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          <StatusIcon size={10} />
        )}
        <span className="capitalize">{statusCfg.label}</span>
      </div>

      {/* Arrow hint */}
      <ArrowRight
        size={14}
        className="text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1"
      />

      {/* Dropdown */}
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
            <ArrowRight size={11} className="mr-1.5" /> View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onTrigger(job);
            }}
          >
            <Play size={11} className="mr-1.5" /> Trigger
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-xs py-1.5 text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job);
            }}
          >
            <Trash2 size={11} className="mr-1.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
