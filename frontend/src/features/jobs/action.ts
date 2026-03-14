"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken } from "@inngest/realtime";

export async function fetchJobSubscriptionToken(jobId: string) {
  const token = await getSubscriptionToken(inngest, {
    channel: `job:${jobId}`,
    topics: ["status"],
  });
  return token;
}
