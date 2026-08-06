from pydantic import BaseModel
from typing import List, Dict, Any


class ComparisonRequest(BaseModel):
    companies_data: List[Dict[str, Any]]