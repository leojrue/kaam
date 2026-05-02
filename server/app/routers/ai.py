from fastapi import APIRouter

from app.schemas import AiGenerateRequest
from app.services.ai_service import generate_questions
from app.utils.response import success


router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/generate")
def generate_questions_endpoint(payload: AiGenerateRequest):
    return success(generate_questions(payload))
