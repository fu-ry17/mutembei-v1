"use server";

import { inngest } from "@/inngest/client";
import { authClient } from "@/lib/auth-client";
import { getSubscriptionToken } from "@inngest/realtime";
import { headers } from "next/headers";

export async function fetchJobSubscriptionToken(jobId: string) {
  const token = await getSubscriptionToken(inngest, {
    channel: `job:${jobId}`,
    topics: ["status"],
  });
  return token;
}

export async function triggerJobAction(jobId: string) {
  const session = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  const res = await inngest.send({
    name: "execute/workflow",
    data: { jobId, userId: session?.data?.user.id },
  });

  return res;
}
