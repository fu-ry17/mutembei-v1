import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from src.config import settings


def _get_key() -> bytes:
    return base64.urlsafe_b64decode(settings.ENCRYPTION_KEY)


def encrypt(plain: str) -> str:
    nonce = os.urandom(12)
    ct = AESGCM(_get_key()).encrypt(nonce, plain.encode(), None)
    return base64.urlsafe_b64encode(nonce + ct).decode()


def decrypt(cipher: str) -> str:
    raw = base64.urlsafe_b64decode(cipher)
    nonce, ct = raw[:12], raw[12:]
    return AESGCM(_get_key()).decrypt(nonce, ct, None).decode()
