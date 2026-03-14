import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CredentialsResponse, CredentialType } from "../types";

interface UseGetCredentialsParams {
  page?: number;
  limit?: number;
  search?: string;
  credential_type?: CredentialType;
}

export const useGetCredentials = ({
  page = 1,
  limit = 10,
  search = "",
  credential_type,
}: UseGetCredentialsParams = {}) => {
  return useQuery({
    queryKey: ["credentials", { page, limit, search, credential_type }],
    queryFn: async (): Promise<CredentialsResponse> => {
      const res = await api.get("/credentials/", {
        params: {
          page,
          limit,
          ...(search && { search }),
          ...(credential_type && { credential_type }),
        },
      });
      return res.data;
    },
  });
};
