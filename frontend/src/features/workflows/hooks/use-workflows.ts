import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { WorkflowsResponse } from "../types";

interface UseGetWorkflowsParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export const useGetWorkflows = ({
  page = 1,
  limit = 10,
  search = "",
  sort = "created_at:desc",
}: UseGetWorkflowsParams = {}) => {
  return useQuery({
    queryKey: ["workflows", { page, limit, search, sort }],
    queryFn: async (): Promise<WorkflowsResponse> => {
      const res = await api.get("/workflows/", {
        params: {
          page,
          limit,
          sort,
          ...(search && { search }),
        },
      });
      return res.data;
    },
  });
};
