import axios from "axios";
import { inngest } from "./client";
import { jobChannel } from "./channels";
import { api } from "@/lib/api";

const MODAL_URL = process.env.WORKFLOW_EXECUTION_BACKEND!;

async function updateJobStatus(
  jobId: string,
  status: string,
  error?: string | null,
) {
  await api.patch(`/jobs/${jobId}/status`, { status, error: error ?? null });
}

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 1,
    triggers: [{ event: "execute/workflow" }],
    concurrency: {
      key: "event.data.userId",
      limit: 2,
    },
  },
  async ({ event, step }) => {
    const { jobId } = event.data;
    const ch = jobChannel({ jobId });

    await step.run("set-queued", async () => {
      await updateJobStatus(jobId, "queued");
    });
    await step.realtime.publish("publish-queued", ch.status, {
      status: "queued",
      error: null,
    });

    const result = await step.run("call-modal", async () => {
      await updateJobStatus(jobId, "running");
      await step.realtime.publish("publish-running", ch.status, {
        status: "running",
        error: null,
      });
      const { data } = await axios.post(
        MODAL_URL,
        { job_id: jobId },
        { timeout: 900_000 },
      );
      return data;
    });

    const finalStatus = result.status === "completed" ? "completed" : "failed";
    const finalError = result.error ?? null;

    await step.run("set-final-status", async () => {
      await updateJobStatus(jobId, finalStatus, finalError);
    });
    await step.realtime.publish("publish-final", ch.status, {
      status: finalStatus,
      error: finalError,
    });

    return { jobId, status: finalStatus };
  },
);
