from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Type

from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.common.pagination import PaginationParams, paginate_query


class BaseService:
    def __init__(
        self,
        model: Type[SQLModel],
        search_fields: Optional[List[str]] = None,
    ):
        self.model = model
        self.search_fields = search_fields or []

    def _apply_where(self, query, where: Dict[str, Any]):
        for field, value in where.items():
            if not hasattr(self.model, field):
                raise ValueError(
                    f"Model '{self.model.__name__}' has no field '{field}'"
                )
            query = query.where(getattr(self.model, field) == value)
        return query

    def _exclude_deleted(self, query):
        if hasattr(self.model, "is_deleted"):
            query = query.where(getattr(self.model, "is_deleted").is_(False))
        return query

    async def get_all(
        self,
        session: AsyncSession,
        params: Optional[PaginationParams] = None,
    ):
        if params:
            items, total = await paginate_query(
                session,
                self.model,
                params,
                search_fields=self.search_fields,
            )
            return {
                "data": items,
                "total": total,
                "page": (params.offset // params.limit) + 1,
                "per_page": params.limit,
            }

        query = select(self.model)
        query = self._exclude_deleted(query)
        result = await session.exec(query)
        return result.all()

    async def get_by_id(
        self,
        session: AsyncSession,
        item_id: Optional[Any] = None,
        where: Optional[Dict[str, Any]] = None,
        include_deleted: bool = False,
    ):
        if item_id is not None and where:
            raise ValueError("Pass either item_id or where, not both.")
        if item_id is None and not where:
            raise ValueError("Provide either item_id or where.")

        if item_id is not None:
            obj = await session.get(self.model, item_id)
            if not obj:
                return None
            if not include_deleted and getattr(obj, "is_deleted", False):
                return None
            return obj

        query = select(self.model)
        query = self._apply_where(query, where)  # type: ignore[arg-type]
        if not include_deleted:
            query = self._exclude_deleted(query)
        result = await session.exec(query)
        return result.first()

    async def create(self, data: Dict, session: AsyncSession):
        obj = self.model(**data)
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
        return obj

    async def update(
        self,
        data: Dict,
        session: AsyncSession,
        item_id: Optional[Any] = None,
        where: Optional[Dict[str, Any]] = None,
    ):
        obj = await self.get_by_id(session, item_id=item_id, where=where)
        if not obj:
            return None
        for k, v in data.items():
            setattr(obj, k, v)
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
        return obj

    async def delete(
        self,
        session: AsyncSession,
        item_id: Optional[Any] = None,
        where: Optional[Dict[str, Any]] = None,
        soft: bool = True,
    ):
        obj = await self.get_by_id(session, item_id=item_id, where=where)
        if not obj:
            return None

        if soft and hasattr(obj, "is_deleted"):
            obj.is_deleted = True
            obj.deleted_at = datetime.now(timezone.utc)
            session.add(obj)
            await session.commit()
            await session.refresh(obj)
            return obj

        await session.delete(obj)
        await session.commit()
        return True

    async def restore(
        self,
        session: AsyncSession,
        item_id: Optional[Any] = None,
        where: Optional[Dict[str, Any]] = None,
    ):
        obj = await self.get_by_id(
            session, item_id=item_id, where=where, include_deleted=True
        )
        if not obj:
            return None
        if not hasattr(obj, "is_deleted"):
            raise ValueError(
                f"Model '{self.model.__name__}' does not support soft delete."
            )
        obj.is_deleted = False
        obj.deleted_at = None
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
        return obj
