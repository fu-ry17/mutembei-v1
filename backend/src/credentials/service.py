from typing import Any, Dict, Optional, cast

from src.common.base_service import BaseService
from src.credentials.utils import decrypt, encrypt
from src.db.models import Credentials


class CredentialsService(BaseService):
    def __init__(self):
        super().__init__(Credentials, search_fields=["title"])

    async def create(self, data: Dict, session):
        data["encrypted_data"] = encrypt(data["encrypted_data"])
        return await super().create(data, session)

    async def update(self, data: Dict, session, item_id=None, where=None):
        if "encrypted_data" in data:
            data["encrypted_data"] = encrypt(data["encrypted_data"])
        return await super().update(data, session, item_id=item_id, where=where)

    async def get_decrypted(
        self, session, item_id=None, where=None
    ) -> Optional[Dict[str, Any]]:
        obj = await self.get_by_id(session, item_id=item_id, where=where)
        if not obj:
            return None
        credential = cast(Credentials, obj)
        data = credential.model_dump()
        data["encrypted_data"] = decrypt(credential.encrypted_data)
        return data


credentials_service = CredentialsService()
