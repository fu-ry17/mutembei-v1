import { cn } from "@/lib/utils";

export interface FilterTab<TValue extends string = string> {
  value: TValue | "all";
  label: string;
  count?: number;
}

interface FilterTabsProps<TValue extends string = string> {
  tabs: FilterTab<TValue>[];
  active: TValue | "all";
  onChange: (value: TValue | "all") => void;
  className?: string;
}

export function FilterTabs<TValue extends string = string>({
  tabs,
  active,
  onChange,
  className,
}: FilterTabsProps<TValue>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap",
            active === tab.value
              ? "border-foreground text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                active === tab.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
