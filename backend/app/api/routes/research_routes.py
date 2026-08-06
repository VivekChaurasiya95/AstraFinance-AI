from fastapi import APIRouter
from app.services.research_service import ResearchService
from app.schemas.research_schema import ResearchRequest

router = APIRouter(
    prefix="/research",
    tags=["Research"],
)

research_service = ResearchService()


@router.post("/")
def research(request: ResearchRequest):
    return research_service.analyze(request.query)