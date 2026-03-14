import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { handleError } from "@/lib/handle-error";

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      try {
        await api.delete(`/workflows/${id}`);
      } catch (error) {
        handleError(error);
        throw error;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
  });
};
