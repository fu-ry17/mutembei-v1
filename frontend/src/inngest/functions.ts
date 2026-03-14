import axios from "axios";
import { inngest } from "./client";
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
    concurrency: {
      key: "event.data.userId",
      limit: 2,
    },
  },
  { event: "execute/workflow" },
  async ({ event, step, publish }) => {
    const { jobId } = event.data;

    await step.run("set-queued", async () => {
      await updateJobStatus(jobId, "queued");
    });

    await publish({
      channel: `job:${jobId}`,
      topic: "status",
      data: { status: "queued", error: null },
    });

    const result = await step.run("call-modal", async () => {
      await updateJobStatus(jobId, "running");

      await publish({
        channel: `job:${jobId}`,
        topic: "status",
        data: { status: "running", error: null },
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

    await publish({
      channel: `job:${jobId}`,
      topic: "status",
      data: { status: finalStatus, error: finalError },
    });

    return { jobId, status: finalStatus };
  },
);
