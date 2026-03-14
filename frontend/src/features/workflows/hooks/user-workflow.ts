import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workflow } from "../types";

export const useGetWorkflow = (workflowId: string) => {
  return useQuery({
    queryKey: ["workflows", workflowId],
    queryFn: async (): Promise<Workflow> => {
      const res = await api.get(`/workflows/${workflowId}`);
      return res.data;
    },
    enabled: !!workflowId,
  });
};
