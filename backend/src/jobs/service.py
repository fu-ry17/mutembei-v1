import json
import uuid
from typing import Any, Dict, Optional, cast

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.common.base_service import BaseService
from src.credentials.utils import decrypt
from src.db.models import Credentials, Job


class JobService(BaseService):
    def __init__(self):
        super().__init__(Job, search_fields=["title", "description", "status", "type"])

    async def get_job_with_credentials(
        self, job_id: uuid.UUID, session: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        obj = await self.get_by_id(session, where={"id": job_id})
        if not obj:
            return None
        job = cast(Job, obj)
        result: Dict[str, Any] = job.model_dump()
        result["credential"] = None
        if job.credential_id:
            query = select(Credentials).where(
                Credentials.id == job.credential_id,
                Credentials.is_deleted.is_(False),  # type: ignore[union-attr]
            )
            cred_result = await session.exec(query)
            credential = cred_result.first()
            if credential:
                cred_data = credential.model_dump()
                cred_data["encrypted_data"] = json.loads(
                    decrypt(credential.encrypted_data)
                )
                result["credential"] = cred_data
        return result


job_service = JobService()
