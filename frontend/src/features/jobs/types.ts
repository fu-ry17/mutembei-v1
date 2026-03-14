export interface Job {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  user_id: string;
  workflow_id: string;
  credential_id?: string | null;
  status: string;
  error?: string | null;
  extra?: Record<string, unknown> | null;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  per_page: number;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateJobPayload {
  title: string;
  type: string;
  description?: string;
  workflow_id: string;
  credential_id?: string;
  status?: string;
  extra?: Record<string, unknown>;
}

export interface UpdateJobPayload {
  id: string;
  title?: string;
  type?: string;
  description?: string;
  credential_id?: string;
  status?: string;
  extra?: Record<string, unknown>;
}

export interface TriggerJobResponse {
  message?: string;
  [key: string]: unknown;
}

export const JOB_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ["self_onboarding", "http"] as const;
export type JobType = (typeof JOB_TYPES)[number];
