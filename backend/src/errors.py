from typing import Any, Awaitable, Callable

from fastapi import FastAPI, status
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


class IntegrationException(Exception):
    """This is the base class for all integration errors"""

    pass


class CredentialNotFound(IntegrationException):
    """Credential Not found"""

    pass


def create_exception_handler(
    status_code: int, initial_detail: Any
) -> Callable[[Request, Exception], Awaitable[JSONResponse]]:
    async def exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(content=initial_detail, status_code=status_code)

    return exception_handler


def register_all_errors(app: FastAPI):
    app.add_exception_handler(
        CredentialNotFound,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Credential not found",
                "error_code": "credential_not_found",
            },
        ),
    )

    @app.exception_handler(500)
    async def internal_server_error(request, exc):

        return JSONResponse(
            content={
                "message": "Oops! Something went wrong",
                "error_code": "server_error",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database__error(request, exc):
        print(str(exc))
        return JSONResponse(
            content={
                "message": "Oops! Something went wrong",
                "error_code": "server_error",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
