from fastapi import APIRouter

from app.schemas import SubmitAnswerRequest
from app.services.answer_service import submit_answer
from app.utils.response import success


router = APIRouter(prefix="/api/answers", tags=["answers"])


@router.post("/submit")
def submit_answer_endpoint(payload: SubmitAnswerRequest):
    return success(submit_answer(payload))
