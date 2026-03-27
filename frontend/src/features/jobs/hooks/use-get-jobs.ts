import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { JobsResponse } from "../types";

const POLLING_INTERVAL = 3000;
const TRANSIENT_STATUSES = ["running", "queued"];

interface UseGetJobsParams {
  workflow_id?: string;
  job_type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export const useGetJobs = ({
  workflow_id,
  job_type,
  status,
  search = "",
  page = 1,
  limit = 5,
  sort = "created_at:desc",
}: UseGetJobsParams = {}) => {
  return useQuery({
    queryKey: [
      "jobs",
      { workflow_id, job_type, status, search, page, limit, sort },
    ],
    queryFn: async (): Promise<JobsResponse> => {
      const res = await api.get("/jobs/", {
        params: {
          page,
          limit,
          sort,
          ...(workflow_id && { workflow_id }),
          ...(job_type && { job_type }),
          ...(status && { status }),
          ...(search && { search }),
        },
      });
      return res.data;
    },
    enabled: !!workflow_id,
    refetchInterval: (query) => {
      const jobs = query.state.data?.data ?? [];
      const hasTransient = jobs.some((job) =>
        TRANSIENT_STATUSES.includes(job.status),
      );
      return hasTransient ? POLLING_INTERVAL : false;
    },
  });
};
