import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { handleError } from "@/lib/handle-error";
import type {
  Workflow,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
} from "../types";

type WorkflowMutationPayload = CreateWorkflowPayload | UpdateWorkflowPayload;

const isUpdate = (p: WorkflowMutationPayload): p is UpdateWorkflowPayload =>
  "id" in p && !!p.id;

export const useCreateUpdateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WorkflowMutationPayload): Promise<Workflow> => {
      try {
        if (isUpdate(payload)) {
          const { id, ...body } = payload;
          const res = await api.patch(`/workflows/${id}`, body);
          return res.data;
        } else {
          const res = await api.post("/workflows/", payload);
          return res.data;
        }
      } catch (error) {
        return handleError(error) as never;
      }
    },

    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(
        isUpdate(payload) ? "Workflow updated" : "Workflow created",
      );
    },
  });
};
