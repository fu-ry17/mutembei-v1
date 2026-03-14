import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  total: number; // total number of items
  limit: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  total,
  limit,
  onChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  if (totalPages <= 1) return null;

  // Build page number buttons — show at most 5, with ellipsis
  function getPages(): (number | "…")[] {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, "…", totalPages];
    if (page >= totalPages - 2)
      return [
        1,
        "…",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "…", page - 1, page, page + 1, "…", totalPages];
  }

  return (
    <div
      className={cn("flex items-center justify-between gap-4 pt-2", className)}
    >
      {/* Count label */}
      <p className="text-xs text-muted-foreground">
        {from}–{to} of {total}
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={13} />
        </Button>

        {getPages().map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="text-xs text-muted-foreground px-1"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => onChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}
