"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get_user_sheet } from "../action";

export const SHEET_QUERY_KEY = ["user-sheet"];

export const useSheet = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: SHEET_QUERY_KEY,
    queryFn: () => get_user_sheet(),
  });

  const setConnected = (title: string): void => {
    queryClient.setQueryData(SHEET_QUERY_KEY, { connected: true, title });
  };

  const setDisconnected = (): void => {
    queryClient.setQueryData(SHEET_QUERY_KEY, {
      connected: false,
      title: null,
    });
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SHEET_QUERY_KEY });

  return {
    connected: data?.connected ?? false,
    title: data?.title ?? null,
    isLoading,
    setConnected,
    setDisconnected,
    invalidate,
  };
};
