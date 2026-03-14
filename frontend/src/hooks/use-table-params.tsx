import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TableParamsOptions<TFilter extends string> {
  filterKey?: string; // URL param name for the filter, default "type"
  filterValues?: TFilter[]; // valid filter values for type safety
  defaultLimit?: number; // default page size, default 10
}

export interface TableParams<TFilter extends string = string> {
  search: string;
  page: number;
  limit: number;
  filter: TFilter | "all";
  setSearch: (v: string) => void;
  setPage: (v: number) => void;
  setLimit: (v: number) => void;
  setFilter: (v: TFilter | "all") => void;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTableParams<TFilter extends string = string>(
  options: TableParamsOptions<TFilter> = {},
): TableParams<TFilter> {
  const { filterKey = "type", defaultLimit = 10 } = options;

  const [params, setParams] = useQueryStates({
    search: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(defaultLimit),
    [filterKey]: parseAsString.withDefault("all"),
  });

  const filter = (params[filterKey] ?? "all") as TFilter | "all";

  function setSearch(v: string) {
    setParams({ search: v, page: 1 }); // reset to page 1 on new search
  }

  function setPage(v: number) {
    setParams({ page: v });
  }

  function setLimit(v: number) {
    setParams({ limit: v, page: 1 });
  }

  function setFilter(v: TFilter | "all") {
    setParams({ [filterKey]: v, page: 1 });
  }

  function reset() {
    setParams({ search: "", page: 1, limit: defaultLimit, [filterKey]: "all" });
  }

  return {
    search: params.search,
    page: params.page,
    limit: params.limit,
    filter,
    setSearch,
    setPage,
    setLimit,
    setFilter,
    reset,
  };
}
