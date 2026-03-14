import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { handleError } from "@/lib/handle-error";
import type {
  Credential,
  CreateCredentialPayload,
  UpdateCredentialPayload,
} from "../types";

type CredentialMutationPayload =
  | CreateCredentialPayload
  | UpdateCredentialPayload;

const isUpdate = (
  payload: CredentialMutationPayload,
): payload is UpdateCredentialPayload => "id" in payload && !!payload.id;

export const useCreateUpdateCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CredentialMutationPayload,
    ): Promise<Credential> => {
      try {
        if (isUpdate(payload)) {
          const { id, ...body } = payload;
          const res = await api.patch(`/credentials/${id}`, body);
          return res.data;
        } else {
          const res = await api.post("/credentials/", payload);
          return res.data;
        }
      } catch (error) {
        return handleError(error) as never;
      }
    },

    onSuccess: (_, payload) => {
      // Invalidate and refetch — no manual cache surgery needed
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success(
        isUpdate(payload) ? "Credential updated" : "Credential created",
      );
    },
  });
};
