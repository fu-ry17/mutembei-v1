import json
import os
import traceback

import httpx
import modal
from pydantic import BaseModel


class JobRequest(BaseModel):
    job_id: str


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(["chromium", "chromium-driver"])
    .pip_install(
        [
            "playwright",
            "httpx",
            "pydantic",
            "fastapi[standard]",
            "pandas",
            "tqdm",
            "gspread",
            "google-auth",
        ]
    )
    .run_commands(["playwright install chromium"])
    .add_local_dir("automation", "/automation")
)

app = modal.App("workflow-runner", image=image)

mount_path = "/data"
volume = modal.Volume.from_name("workflow-runner", create_if_missing=True)

integration_url = os.environ.get("INTEGRATION_URL")


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
        print("✅ Runner ready")

    async def _update_status(
        self, client, job_id, status, error=None, description=None
    ):
        payload = {"status": status, "error": error}
        if description is not None:
            payload["description"] = description
        await client.patch(
            f"{integration_url}/jobs/{job_id}/status",
            json=payload,
        )

    @modal.fastapi_endpoint(method="POST")
    async def run_job(self, request: JobRequest):
        from automation.facility_setup import run_facility_setup
        from automation.shif_config import run_pipeline

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{integration_url}/jobs/{request.job_id}/with-credentials"
            )
            if resp.status_code == 404:
                return {"error": "Job not found"}
            resp.raise_for_status()

            job = resp.json()
            print(f"📦 Job received: {job['id']} | type={job['type']}")

            await self._update_status(client, request.job_id, "running")

            try:
                result = {}

                if job["type"] == "self_onboarding":
                    await run_facility_setup(job)

                elif job["type"] == "shif_config":
                    print("⏳ Running shif_config pipeline ...")
                    result = run_pipeline(job)
                    print(f"📊 Pipeline result: {result}")
                    if not result["success"]:
                        raise RuntimeError(result["error"])

                else:
                    raise ValueError(f"Unknown job type: {job['type']}")

                description = json.dumps(result, indent=2)
                await self._update_status(
                    client, request.job_id, "completed", description=description
                )
                return {"status": "completed", "result": result}

            except Exception as e:
                tb = traceback.format_exc()
                error_msg = f"{str(e)}\n{tb}"
                print(f"❌ Job failed:\n{error_msg}")
                await self._update_status(
                    client, request.job_id, "failed", error=error_msg
                )
                return {"status": "failed", "error": error_msg}


@app.local_entrypoint()
def main():
    workflow_runner = WorkflowRunner()
    url = workflow_runner.run_job.get_web_url()
    response = httpx.post(
        url,
        json={"job_id": "70cf3ffd-b2e2-4514-a2e5-5a6c918f7f57"},
        timeout=900.0,
    )
    response.raise_for_status()
    print(response.json())
