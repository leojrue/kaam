def generate_questions(payload):
    question_list = []
    for index in range(payload.count):
        question_list.append({
            "id": f"ai_placeholder_{index + 1}",
            "title": f"{payload.topic or 'KAAM'} 相关单选题 {index + 1}",
            "option": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
            "answer": "A",
            "score": 5,
            "analysis": "AI 接口暂未接入，这是后端占位返回。"
        })
    return {"questionList": question_list}
