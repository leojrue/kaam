from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import initialize_database
from app.routers import ai, answers, question_banks


PROJECT_ROOT = Path(__file__).resolve().parents[2]

app = FastAPI(title="KAAM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup_event():
    initialize_database()


@app.get("/api/health")
def health_check():
    return {"success": True, "data": {"status": "ok"}}


app.include_router(question_banks.router)
app.include_router(answers.router)
app.include_router(ai.router)

app.mount("/", StaticFiles(directory=PROJECT_ROOT, html=True), name="frontend")
