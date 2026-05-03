import time

from fastapi import HTTPException
from pymysql.err import IntegrityError

from app.database import create_connection
from app.utils.security import hash_password, verify_password


def _public_user(user):
    return {
        "userId": user["id"],
        "account": user["account"],
        "avatarText": user["avatar_text"] or user["account"][:1].upper()
    }


def register_user(payload):
    account = payload.account.strip()
    now = int(time.time() * 1000)
    connection = create_connection()
    try:
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    INSERT INTO users (account, password_hash, avatar_text, create_time, update_time)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (account, hash_password(payload.password), account[:1].upper(), now, now)
                )
                user_id = cursor.lastrowid
                connection.commit()
                return {
                    "userId": user_id,
                    "account": account,
                    "avatarText": account[:1].upper()
                }
            except IntegrityError:
                connection.rollback()
                raise HTTPException(status_code=409, detail="账号已存在")
    finally:
        connection.close()


def login_user(payload):
    connection = create_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE account = %s", (payload.account.strip(),))
            user = cursor.fetchone()
            if not user or not verify_password(payload.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="账号或密码不正确")
            return _public_user(user)
    finally:
        connection.close()


def get_user(user_id: int):
    connection = create_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="登录信息已失效")
            return _public_user(user)
    finally:
        connection.close()
