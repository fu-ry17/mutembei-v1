import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { handleError } from "@/lib/handle-error";
import type {
  Job,
  CreateJobPayload,
  UpdateJobPayload,
  TriggerJobResponse,
} from "../types";
import { inngest } from "@/inngest/client";
import { authClient } from "@/lib/auth-client";

type JobMutationPayload = CreateJobPayload | UpdateJobPayload;

const isUpdate = (p: JobMutationPayload): p is UpdateJobPayload =>
  "id" in p && !!p.id;

export const useCreateUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: JobMutationPayload): Promise<Job> => {
      try {
        if (isUpdate(payload)) {
          const { id, ...body } = payload;
          const res = await api.patch(`/jobs/${id}`, body);
          return res.data;
        } else {
          const res = await api.post("/jobs/", payload);
          return res.data;
        }
      } catch (error) {
        return handleError(error) as never;
      }
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(isUpdate(payload) ? "Job updated" : "Job created");
    },
  });
};

export const useTriggerJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string): Promise<TriggerJobResponse> => {
      try {
        const session = await authClient.getSession();
        const res = await inngest.send({
          name: "execute/workflow",
          data: { jobId, userId: session?.data?.user.id },
        });
        return res as TriggerJobResponse;
      } catch (error) {
        return handleError(error) as never;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job triggered successfully");
    },
  });
};
