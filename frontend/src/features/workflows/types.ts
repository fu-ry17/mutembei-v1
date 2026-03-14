export interface Workflow {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
}

export interface WorkflowsResponse {
  data: Workflow[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateWorkflowPayload {
  title: string;
  description?: string;
}

export interface UpdateWorkflowPayload {
  id: string;
  title?: string;
  description?: string;
}
