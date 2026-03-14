import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import AuthBearer
from src.common.pagination import PaginationParams, get_pagination_params
from src.credentials.service import credentials_service
from src.db.main import get_session

from .schema import (
    CredentialResponse,
    CredsCreateUpdate,
    PaginatedCredentialResponse,
)

credentials_router = APIRouter()
auth = AuthBearer()


@credentials_router.get("/", response_model=PaginatedCredentialResponse)
async def list_credentials(
    credential_type: Optional[str] = Query(
        default=None, description="Filter by type e.g. playwright, google_drive"
    ),
    params: PaginationParams = Depends(get_pagination_params),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    filters = {"user_id": user["sub"]}
    if credential_type:
        filters["credential_type"] = credential_type
    params.filters = filters
    return await credentials_service.get_all(session, params)


@credentials_router.post("/", response_model=CredentialResponse, status_code=201)
async def create_credential(
    body: CredsCreateUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    data = body.model_dump()
    data["user_id"] = user["sub"]
    return await credentials_service.create(data, session)


@credentials_router.get("/{credential_id}", response_model=CredentialResponse)
async def get_credential(
    credential_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    obj = await credentials_service.get_by_id(
        session, where={"id": credential_id, "user_id": user["sub"]}
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Credential not found")
    return obj


@credentials_router.patch("/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: uuid.UUID,
    body: CredsCreateUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    updated = await credentials_service.update(
        body.model_dump(exclude_unset=True),
        session,
        where={"id": credential_id, "user_id": user["sub"]},  # scoped to user
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Credential not found")
    return updated


@credentials_router.delete("/{credential_id}", status_code=200)
async def delete_credential(
    credential_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    result = await credentials_service.delete(
        session,
        where={"id": credential_id, "user_id": user["sub"]},  # scoped to user
        soft=False,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Credential not found")
    return {"deleted": True}
