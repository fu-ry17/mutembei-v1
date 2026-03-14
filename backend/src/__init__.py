from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.credentials.router import credentials_router
from src.db.main import init_db
from src.jobs.router import jobs_router
from src.workflows.router import workflows_router


@asynccontextmanager
async def life_span(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=life_span)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(credentials_router, prefix="/credentials", tags=["Credentials"])
app.include_router(workflows_router, prefix="/workflows", tags=["Workflows"])
app.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("src:app", host="0.0.0.0", port=7001)
