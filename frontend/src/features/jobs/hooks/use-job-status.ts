"use client";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { fetchJobSubscriptionToken } from "../action";

export function useJobStatus(jobId: string) {
  const queryClient = useQueryClient();
  const lastStatusRef = useRef<string | null>(null);

  const { latestData } = useInngestSubscription({
    refreshToken: () => fetchJobSubscriptionToken(jobId),
  });

  useEffect(() => {
    const status = latestData?.data?.status;
    // Only invalidate if status actually changed to avoid redundant refetches
    if (status && status !== lastStatusRef.current) {
      lastStatusRef.current = status;
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] }); // list view
    }
  }, [latestData, jobId, queryClient]);

  return;
}
