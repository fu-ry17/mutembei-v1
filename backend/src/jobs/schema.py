import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


class PaginatedJobResponse(BaseModel):
    data: List["JobResponse"]
    total: int
    page: int
    per_page: int


class JobCreateUpdate(BaseModel):
    title: str
    type: str
    description: Optional[str] = None
    workflow_id: uuid.UUID
    credential_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    extra: Optional[dict[str, Any]] = None


class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    type: str
    description: Optional[str] = None
    user_id: str
    workflow_id: uuid.UUID
    credential_id: Optional[uuid.UUID] = None
    status: str
    error: Optional[str] = None
    extra: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True


class CredentialData(BaseModel):
    id: uuid.UUID
    credential_type: str
    encrypted_data: dict[str, Any]
    extra: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobWithCredentialsResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    user_id: str
    workflow_id: uuid.UUID
    credential_id: Optional[uuid.UUID] = None
    status: str
    error: Optional[str] = None
    extra: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    credential: Optional[CredentialData] = None

    class Config:
        from_attributes = True


class JobStatusUpdate(BaseModel):
    status: str
    error: Optional[str] = None
