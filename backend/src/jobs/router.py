import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import AuthBearer
from src.common.pagination import PaginationParams, get_pagination_params
from src.db.main import get_session

from .schema import (
    JobCreateUpdate,
    JobResponse,
    JobStatusUpdate,
    JobWithCredentialsResponse,
    PaginatedJobResponse,
)
from .service import job_service

jobs_router = APIRouter()
auth = AuthBearer()


@jobs_router.get("/", response_model=PaginatedJobResponse)
async def list_jobs(
    workflow_id: Optional[uuid.UUID] = Query(
        default=None, description="Filter by workflow id"
    ),
    job_type: Optional[str] = Query(default=None, description="Filter by job type"),
    status: Optional[str] = Query(default=None, description="Filter by job status"),
    search: Optional[str] = Query(
        default=None, description="Optional search by title/description/status"
    ),
    params: PaginationParams = Depends(get_pagination_params),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    filters: Dict[str, Any] = {"user_id": user["sub"]}
    if workflow_id:
        filters["workflow_id"] = workflow_id
    if job_type:
        filters["type"] = job_type
    if status:
        filters["status"] = status
    params.filters = filters
    if search:
        params.search = search
    return await job_service.get_all(session, params)


@jobs_router.post("/", response_model=JobResponse, status_code=201)
async def create_job(
    body: JobCreateUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    data = body.model_dump()
    data["user_id"] = user["sub"]
    return await job_service.create(data, session)


@jobs_router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    obj = await job_service.get_by_id(
        session, where={"id": job_id, "user_id": user["sub"]}
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Job not found")
    return obj


@jobs_router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: uuid.UUID,
    body: JobCreateUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    updated = await job_service.update(
        body.model_dump(exclude_unset=True),
        session,
        where={"id": job_id, "user_id": user["sub"]},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found")
    return updated


@jobs_router.delete("/{job_id}", status_code=200)
async def delete_job(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    result = await job_service.delete(
        session,
        where={"id": job_id, "user_id": user["sub"]},
        soft=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"deleted": True}


@jobs_router.post(
    "/{job_id}/restore", response_model=JobResponse, include_in_schema=False
)
async def restore_job(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    obj = await job_service.restore(
        session,
        where={"id": job_id, "user_id": user["sub"]},
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Job not found or not deleted")
    return obj


@jobs_router.patch("/{job_id}/status", response_model=JobResponse)
async def update_job_status(
    job_id: uuid.UUID,
    body: JobStatusUpdate,
    session: AsyncSession = Depends(get_session),
):
    updated = await job_service.update(
        {"status": body.status, "error": body.error, "description": body.description},
        session,
        where={"id": job_id},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found")
    return updated


@jobs_router.get(
    "/{job_id}/with-credentials",
    response_model=JobWithCredentialsResponse,
    include_in_schema=False,
)
async def get_job_with_credentials(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await job_service.get_job_with_credentials(job_id, session)
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return result
