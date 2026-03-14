import os

import httpx
import modal
from pydantic import BaseModel


class JobRequest(BaseModel):
    job_id: str


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(["chromium", "chromium-driver"])
    .pip_install(["playwright", "httpx", "pydantic", "fastapi[standard]"])
    .run_commands(["playwright install chromium"])
    .add_local_dir("automation", "/automation")
)

app = modal.App("workflow-runner", image=image)
mount_path = "/data"
volume = modal.Volume.from_name("workflow-runner", create_if_missing=True)


@app.cls(
    timeout=900,
    retries=0,
    scaledown_window=20,
    volumes={mount_path: volume},
    secrets=[modal.Secret.from_name("workflow-secrets")],
)
class WorkflowRunner:
    @modal.enter()
    def setup(self):
        import sys

        sys.path.insert(0, "/")
        print("Runner ready")

    async def _update_status(
        self,
        client: httpx.AsyncClient,
        job_id: str,
        status: str,
        error: str | None = None,
    ):
        await client.patch(
            f"{os.environ['INTEGRATION_URL']}/jobs/{job_id}/status",
            json={"status": status, "error": error},
        )

    @modal.fastapi_endpoint(method="POST")
    async def run_job(self, request: JobRequest):
        from automation.facility_setup import run_facility_setup

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{os.environ['INTEGRATION_URL']}/jobs/{request.job_id}/with-credentials"
            )
            if resp.status_code == 404:
                return {"error": "Job not found"}
            resp.raise_for_status()
            data = resp.json()

            await self._update_status(client, request.job_id, "running")
            try:
                # switch based on type
                await run_facility_setup(data)
                await self._update_status(client, request.job_id, "completed")
                return {"status": "completed"}
            except Exception as e:
                await self._update_status(
                    client, request.job_id, "failed", error=str(e)
                )
                return {"status": "failed", "error": str(e)}


@app.local_entrypoint()
def main():
    workflow_runner = WorkflowRunner()
    url = workflow_runner.run_job.get_web_url()
    response = httpx.post(
        url, json={"job_id": "e376c9e5-431d-48ba-b5d5-bc530fe15ab7"}, timeout=900.0
    )
    response.raise_for_status()
    print(response.json())
