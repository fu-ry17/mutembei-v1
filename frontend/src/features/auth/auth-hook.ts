import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

export const useSession = () => {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) return null;
      return data?.user ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });

  return { user, isLoading, error };
};
