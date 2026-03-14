import logging

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

from src.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AuthBearer:
    def __init__(self, auth_server_url: str = settings.AUTH_URL):
        self.auth_server_url = auth_server_url
        self.jwks_client = jwt.PyJWKClient(f"{auth_server_url}/api/auth/jwks")

    async def verify_token(self, credentials=Depends(HTTPBearer())) -> dict:
        token = credentials.credentials
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key,
                algorithms=["EdDSA"],
                audience="workflow-app",
                issuer="workflow-app",
            )
        except jwt.PyJWTError as e:
            logger.warning("JWT error: %s — %s", type(e).__name__, e)
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            logger.error("Token verification failed: %s", e, exc_info=True)
            raise HTTPException(status_code=401, detail="Token verification failed")

    async def login(self, email: str, password: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                login_response = await client.post(
                    f"{self.auth_server_url}/api/auth/sign-in/email",
                    json={"email": email, "password": password},
                )
                if login_response.status_code == 401:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
                login_response.raise_for_status()
                token_response = await client.get(
                    f"{self.auth_server_url}/api/auth/token"
                )
                token_response.raise_for_status()
            return {
                "user": login_response.json()["user"],
                "access_token": token_response.json()["token"],
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Login failed: %s", e, exc_info=True)
            raise HTTPException(status_code=500, detail="Login failed")
