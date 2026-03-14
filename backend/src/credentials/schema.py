# src/schemas/credentials.py
import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


class CredsCreateUpdate(BaseModel):
    title: str
    credential_type: Optional[str] = None
    encrypted_data: Optional[str] = None
    extra: Optional[dict[str, Any]] = None


class CredentialResponse(BaseModel):
    id: uuid.UUID
    title: str
    user_id: str
    credential_type: str
    extra: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CredentialDecryptedResponse(CredentialResponse):
    encrypted_data: str


class PaginatedCredentialResponse(BaseModel):
    data: List[CredentialResponse]
    total: int
    page: int
    per_page: int