from fastapi import APIRouter

from app.schemas import CheckAnswerAccessRequest, SubmitAnswerRequest
from app.services.answer_service import ensure_answer_not_submitted, submit_answer
from app.utils.response import success


router = APIRouter(prefix="/api/answers", tags=["answers"])


@router.post("/submit")
def submit_answer_endpoint(payload: SubmitAnswerRequest):
    return success(submit_answer(payload))


@router.post("/check-access")
def check_answer_access_endpoint(payload: CheckAnswerAccessRequest):
    return success(ensure_answer_not_submitted(payload.shareCode, payload.deviceId))
