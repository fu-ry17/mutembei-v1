import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Job } from "../types";

const POLLING_INTERVAL = 3000;
const TRANSIENT_STATUSES = ["running", "queued"];

export const useGetJob = (jobId: string) => {
  return useQuery({
    queryKey: ["jobs", jobId],
    queryFn: async (): Promise<Job> => {
      const res = await api.get(`/jobs/${jobId}`);
      return res.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data && TRANSIENT_STATUSES.includes(query.state.data.status)
        ? POLLING_INTERVAL
        : false,
  });
};
