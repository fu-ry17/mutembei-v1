from typing import Dict, List, Optional, Tuple, Type

from fastapi import Depends, Query
from sqlalchemy import asc, desc, or_
from sqlmodel import SQLModel, func, select
from sqlmodel.ext.asyncio.session import AsyncSession


class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=10, ge=1, le=100),
        search: Optional[str] = Query(default=None),
        sort: Optional[str] = Query(
            default=None,
            description="Format: field:direction e.g. created_at:desc or title:asc",
        ),
    ):
        self.limit = limit
        self.offset = (page - 1) * limit
        self.page = page
        self.search = search
        self.filters: Optional[Dict[str, str]] = None

        # parse sort e.g. "created_at:desc" → sort_by="created_at", sort_order="desc"
        if sort and ":" in sort:
            parts = sort.split(":", 1)
            self.sort_by = parts[0].strip()
            self.sort_order = (
                parts[1].strip().lower()
                if parts[1].strip().lower() in ("asc", "desc")
                else "desc"
            )
        else:
            self.sort_by = sort  # fallback: just a field name, default desc
            self.sort_order = "desc"


def get_pagination_params(
    params: PaginationParams = Depends(PaginationParams),
) -> PaginationParams:
    return params


async def paginate_query(
    session: AsyncSession,
    model: Type[SQLModel],
    params: PaginationParams,
    search_fields: Optional[List[str]] = None,
) -> Tuple[List[SQLModel], int]:
    query = select(model)

    if params.search and search_fields:
        conditions = [
            getattr(model, field).ilike(f"%{params.search}%")
            for field in search_fields
            if hasattr(model, field)
        ]
        if conditions:
            query = query.where(or_(*conditions))

    if params.filters:
        for field, value in params.filters.items():
            if hasattr(model, field):
                query = query.where(getattr(model, field) == value)

    if hasattr(model, "is_deleted"):
        query = query.where(getattr(model, "is_deleted").is_(False))

    if params.sort_by and hasattr(model, params.sort_by):
        column = getattr(model, params.sort_by)
        query = query.order_by(
            asc(column) if params.sort_order == "asc" else desc(column)
        )
    else:
        if hasattr(model, "created_at"):
            query = query.order_by(desc(getattr(model, "created_at")))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.exec(count_query)
    total = total_result.one()

    result = await session.exec(query.offset(params.offset).limit(params.limit))
    items = list(result.all())
    return items, total
