import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import AuthBearer
from src.common.pagination import PaginationParams, get_pagination_params
from src.db.main import get_session

from .schema import PaginatedWorkflowResponse, WorkflowCreateUpdate, WorkflowResponse
from .service import workflow_service

workflows_router = APIRouter()
auth = AuthBearer()


@workflows_router.get("/", response_model=PaginatedWorkflowResponse)
async def list_workflows(
    search: Optional[str] = Query(
        default=None, description="Optional search by title/description"
    ),
    params: PaginationParams = Depends(get_pagination_params),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    filters = {"user_id": user["sub"]}
    params.filters = filters
    if search:
        params.search = search
    return await workflow_service.get_all(session, params)


@workflows_router.post("/", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    body: WorkflowCreateUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    data = body.model_dump()
    data["user_id"] = user["sub"]
    return await workflow_service.create(data, session)


@workflows_router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    obj = await workflow_service.get_by_id(
        session, where={"id": workflow_id, "user_id": user["sub"]}
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return obj


@workflows_router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowCreateUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    updated = await workflow_service.update(
        body.model_dump(exclude_unset=True),
        session,
        where={"id": workflow_id, "user_id": user["sub"]},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return updated


@workflows_router.delete("/{workflow_id}", status_code=200)
async def delete_workflow(
    workflow_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    result = await workflow_service.delete(
        session,
        where={"id": workflow_id, "user_id": user["sub"]},
        soft=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"deleted": True}


@workflows_router.post(
    "/{workflow_id}/restore", response_model=WorkflowResponse, include_in_schema=False
)
async def restore_workflow(
    workflow_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(auth.verify_token),
):
    obj = await workflow_service.restore(
        session,
        where={"id": workflow_id, "user_id": user["sub"]},
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found or not deleted")
    return obj
