import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounce = 400,
  className,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, debounce);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 pr-8 text-sm"
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
