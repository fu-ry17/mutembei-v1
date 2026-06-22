import { realtime } from "inngest";
import { z } from "zod";

export const jobChannel = realtime.channel({
  name: ({ jobId }: { jobId: string }) => `job:${jobId}`,
  topics: {
    status: {
      schema: z.object({
        status: z.string(),
        error: z.string().nullable(),
      }),
    },
  },
});
