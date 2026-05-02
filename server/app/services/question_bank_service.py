import json
import time

from fastapi import HTTPException
from pymysql.err import IntegrityError

from app.config import settings
from app.database import create_connection
from app.utils.security import hash_password, verify_password
from app.utils.share_code import generate_share_code
from app.utils.validators import normalize_share_code, validate_question_options, validate_rank_rules


DEFAULT_RANK_RULES = [
    {"minPercent": 90, "maxPercent": 100, "name": "满分大神"},
    {"minPercent": 80, "maxPercent": 89, "name": "知识达人"},
    {"minPercent": 60, "maxPercent": 79, "name": "合格选手"},
    {"minPercent": 0, "maxPercent": 59, "name": "趣味小白"}
]


def _load_json(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value)


def _get_bank_by_code(share_code: str, include_deleted=False):
    normalized_code = normalize_share_code(share_code)
    connection = create_connection()
    try:
        with connection.cursor() as cursor:
            if include_deleted:
                cursor.execute("SELECT * FROM question_banks WHERE share_code = %s", (normalized_code,))
            else:
                cursor.execute(
                    "SELECT * FROM question_banks WHERE share_code = %s AND status = 'active'",
                    (normalized_code,)
                )
            return cursor.fetchone()
    finally:
        connection.close()


def _public_question(question):
    return {
        "id": question.get("id"),
        "title": question.get("title", ""),
        "option": question.get("option", []),
        "score": question.get("score", 0),
        "analysis": ""
    }


def create_question_bank(payload):
    validate_rank_rules(payload.rankRules)
    question_list = []
    total_score = 0
    now = int(time.time() * 1000)

    for index, question in enumerate(payload.questionList):
        validate_question_options(question, index)
        question_score = int(question.score)
        total_score += question_score
        question_list.append({
            "id": question.id or f"q_{now}_{index}",
            "title": question.title.strip(),
            "option": [option.strip() for option in question.option],
            "answer": question.answer,
            "score": question_score,
            "analysis": question.analysis.strip()
        })

    rank_rules = [rule.model_dump() for rule in payload.rankRules] or DEFAULT_RANK_RULES
    rank_rule = {
        "mode": "percent",
        "rules": rank_rules
    }
    password_hash = hash_password(payload.creatorPassword)

    connection = create_connection()
    try:
        with connection.cursor() as cursor:
            for _ in range(20):
                share_code = generate_share_code()
                try:
                    cursor.execute(
                        """
                        INSERT INTO question_banks (
                          share_code, creator_name, creator_pwd_hash, title, description,
                          question_list, rank_rule, total_score, status,
                          create_time, update_time, ai_generated_count
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s)
                        """,
                        (
                            share_code,
                            payload.creatorName.strip(),
                            password_hash,
                            payload.title.strip(),
                            payload.description.strip(),
                            json.dumps(question_list, ensure_ascii=False),
                            json.dumps(rank_rule, ensure_ascii=False),
                            total_score,
                            now,
                            now,
                            payload.aiGeneratedCount
                        )
                    )
                    connection.commit()
                    return {
                        "shareCode": share_code,
                        "shareUrl": f"{settings.app_base_url}/answer.html?code={share_code}"
                    }
                except IntegrityError:
                    connection.rollback()
                    continue
    finally:
        connection.close()

    raise HTTPException(status_code=500, detail="分享码生成失败，请重试")


def get_public_question_bank(share_code: str):
    bank = _get_bank_by_code(share_code)
    if not bank:
        raise HTTPException(status_code=404, detail="未找到对应题库")

    question_list = _load_json(bank["question_list"], [])
    return {
        "shareCode": bank["share_code"],
        "creatorName": bank["creator_name"],
        "title": bank["title"],
        "description": bank["description"] or "",
        "totalScore": bank["total_score"],
        "questionList": [_public_question(question) for question in question_list]
    }


def manage_question_bank(payload):
    bank = _get_bank_by_code(payload.shareCode, include_deleted=True)
    if not bank:
        raise HTTPException(status_code=404, detail="未找到对应题库")
    if not verify_password(payload.creatorPassword, bank["creator_pwd_hash"]):
        raise HTTPException(status_code=403, detail="管理口令不正确")

    if payload.action == "delete":
        connection = create_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE question_banks SET status = 'deleted', update_time = %s WHERE share_code = %s",
                    (int(time.time() * 1000), bank["share_code"])
                )
            connection.commit()
        finally:
            connection.close()
        return {"ok": True}

    question_list = _load_json(bank["question_list"], [])
    return {
        "shareCode": bank["share_code"],
        "title": bank["title"],
        "description": bank["description"] or "",
        "creatorName": bank["creator_name"],
        "questionCount": len(question_list),
        "totalScore": bank["total_score"],
        "createTime": bank["create_time"],
        "updateTime": bank["update_time"],
        "status": bank["status"]
    }


def get_private_question_bank(share_code: str):
    bank = _get_bank_by_code(share_code)
    if not bank:
        raise HTTPException(status_code=404, detail="未找到对应题库")
    bank["question_list"] = _load_json(bank["question_list"], [])
    bank["rank_rule"] = _load_json(bank["rank_rule"], {"mode": "percent", "rules": DEFAULT_RANK_RULES})
    return bank
