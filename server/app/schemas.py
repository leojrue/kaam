from typing import Literal

from pydantic import BaseModel, Field


AnswerLetter = Literal["A", "B", "C", "D"]


class QuestionItem(BaseModel):
    id: str | None = None
    title: str = Field(min_length=1, max_length=200)
    option: list[str] = Field(min_length=4, max_length=4)
    answer: AnswerLetter
    score: int = Field(default=5, ge=1, le=100)
    analysis: str = Field(default="", max_length=240)


class RankRuleItem(BaseModel):
    minPercent: int = Field(ge=0, le=100)
    maxPercent: int = Field(ge=0, le=100)
    name: str = Field(min_length=1, max_length=24)


class CreateQuestionBankRequest(BaseModel):
    creatorName: str = Field(min_length=1, max_length=24)
    creatorPassword: str = Field(min_length=4, max_length=64)
    title: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=240)
    questionList: list[QuestionItem] = Field(min_length=1, max_length=100)
    rankRules: list[RankRuleItem] = Field(default_factory=list)
    aiGeneratedCount: int = Field(default=0, ge=0)


class SubmitAnswerRequest(BaseModel):
    shareCode: str = Field(min_length=4, max_length=16)
    answerName: str = Field(min_length=1, max_length=24)
    userAnswer: list[str] = Field(min_length=1, max_length=100)


class ManageQuestionBankRequest(BaseModel):
    action: Literal["get", "delete", "update"]
    shareCode: str = Field(min_length=4, max_length=16)
    creatorPassword: str = Field(min_length=4, max_length=64)


class AiGenerateRequest(BaseModel):
    action: str = "generate"
    topic: str = Field(default="KAAM", max_length=40)
    count: int = Field(default=3, ge=1, le=10)
