import hashlib
import json
import time

from fastapi import HTTPException
from pymysql.err import IntegrityError

from app.database import create_connection
from app.services.question_bank_service import get_private_question_bank
from app.utils.validators import normalize_share_code


def _match_rank_name(score: int, total_score: int, rank_rule: dict) -> str:
    if total_score <= 0:
        return "未评级"
    percent = round((score / total_score) * 100)
    for rule in rank_rule.get("rules", []):
        if int(rule.get("minPercent", 0)) <= percent <= int(rule.get("maxPercent", 100)):
            return rule.get("name", "未评级")
    return "未评级"


def _build_answer_user_key(share_code: str, device_id: str) -> str:
    raw_key = f"{normalize_share_code(share_code)}:{device_id.strip()}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def submit_answer(payload):
    bank = get_private_question_bank(payload.shareCode)
    question_list = bank["question_list"]
    if len(payload.userAnswer) != len(question_list):
        raise HTTPException(status_code=400, detail="答案数量与题目数量不一致")

    score = 0
    correct_count = 0
    detail_list = []

    for index, question in enumerate(question_list):
        user_answer = str(payload.userAnswer[index] or "").upper()
        correct_answer = question.get("answer")
        is_correct = user_answer == correct_answer
        question_score = int(question.get("score", 0))
        if is_correct:
            score += question_score
            correct_count += 1
        detail_list.append({
            "title": question.get("title", ""),
            "option": question.get("option", []),
            "answer": correct_answer,
            "userAnswer": user_answer,
            "score": question_score,
            "analysis": question.get("analysis", ""),
            "isCorrect": is_correct
        })

    wrong_count = len(question_list) - correct_count
    rank_name = _match_rank_name(score, int(bank["total_score"]), bank["rank_rule"])
    submit_time = int(time.time() * 1000)
    normalized_code = normalize_share_code(payload.shareCode)
    device_id = payload.deviceId.strip()
    answer_user_key = _build_answer_user_key(normalized_code, device_id)

    connection = create_connection()
    try:
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    INSERT INTO answer_records (
                      share_code, answer_name, device_id, answer_user_key, user_answer, score,
                      correct_count, wrong_count, rank_name, submit_time
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        normalized_code,
                        payload.answerName.strip(),
                        device_id,
                        answer_user_key,
                        json.dumps(payload.userAnswer, ensure_ascii=False),
                        score,
                        correct_count,
                        wrong_count,
                        rank_name,
                        submit_time
                    )
                )
                connection.commit()
            except IntegrityError:
                connection.rollback()
                raise HTTPException(status_code=409, detail="你已经答过这套题了")
    finally:
        connection.close()

    return {
        "shareCode": normalized_code,
        "bankTitle": bank["title"],
        "answerName": payload.answerName.strip(),
        "score": score,
        "totalScore": bank["total_score"],
        "correctCount": correct_count,
        "wrongCount": wrong_count,
        "rankName": rank_name,
        "detailList": detail_list,
        "submitTime": submit_time
    }
