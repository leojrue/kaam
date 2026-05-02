from fastapi import HTTPException


ANSWER_LETTERS = {"A", "B", "C", "D"}


def normalize_share_code(share_code: str) -> str:
    return str(share_code or "").strip().upper()


def validate_question_options(question, index: int):
    options = [option.strip() for option in question.option]
    if len(options) != 4 or any(not option for option in options):
        raise HTTPException(status_code=400, detail=f"第 {index + 1} 题需要完整填写 4 个选项")
    if question.answer not in ANSWER_LETTERS:
        raise HTTPException(status_code=400, detail=f"第 {index + 1} 题需要选择正确答案")


def validate_rank_rules(rank_rules):
    for index, rule in enumerate(rank_rules):
        if rule.minPercent > rule.maxPercent:
            raise HTTPException(status_code=400, detail=f"第 {index + 1} 条称号规则区间不正确")
