import uuid
from typing import Any, List, Optional

from pydantic import BaseModel


class PaginatedWorkflowResponse(BaseModel):
    data: List["WorkflowResponse"]
    total: int
    page: int
    per_page: int


class WorkflowCreateUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    extra: Optional[dict[str, Any]] = None


class WorkflowResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    title: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

