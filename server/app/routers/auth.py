from fastapi import APIRouter

from app.schemas import AuthRequest
from app.services.auth_service import get_user, login_user, register_user
from app.utils.response import success


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
def register_endpoint(payload: AuthRequest):
    return success(register_user(payload))


@router.post("/login")
def login_endpoint(payload: AuthRequest):
    return success(login_user(payload))


@router.get("/me/{user_id}")
def me_endpoint(user_id: int):
    return success(get_user(user_id))
