from fastapi import APIRouter
from app.services.comparison_service import ComparisonService
from app.schemas.comparison_schema import ComparisonRequest

router = APIRouter(
    prefix="/comparison",
    tags=["Comparison"],
)

comparison_service = ComparisonService()


@router.post("/")
def compare_companies(request: ComparisonRequest):
    return comparison_service.compare_companies(request.companies_data)