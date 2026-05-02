from fastapi import APIRouter

from app.schemas import CreateQuestionBankRequest, ManageQuestionBankRequest
from app.services.question_bank_service import create_question_bank, get_public_question_bank, manage_question_bank
from app.utils.response import success


router = APIRouter(prefix="/api/question-banks", tags=["question-banks"])


@router.post("")
def create_question_bank_endpoint(payload: CreateQuestionBankRequest):
    return success(create_question_bank(payload))


@router.get("/{share_code}")
def get_question_bank_endpoint(share_code: str):
    return success(get_public_question_bank(share_code))


@router.post("/manage")
def manage_question_bank_endpoint(payload: ManageQuestionBankRequest):
    return success(manage_question_bank(payload))
