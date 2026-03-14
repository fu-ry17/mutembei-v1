from src.common.base_service import BaseService
from src.db.models import Workflow


class WorkflowService(BaseService):
    def __init__(self):
        super().__init__(Workflow, search_fields=["title", "description"])


workflow_service = WorkflowService()
