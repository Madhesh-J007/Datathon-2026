from pydantic import BaseModel
from typing import List, Optional

class AssistantQueryRequest(BaseModel):
    query: str

class AssistantQueryResponse(BaseModel):
    answer: str
    source_case_ids: List[int]
    model_version: str
    download_url: Optional[str] = None
