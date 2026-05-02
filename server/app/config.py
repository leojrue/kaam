import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_base_url: str = os.getenv("APP_BASE_URL", "http://127.0.0.1:8000")
    mysql_host: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = os.getenv("MYSQL_USER", "root")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "33333333")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "kaam")
    ai_daily_limit: int = int(os.getenv("AI_DAILY_LIMIT", "20"))


settings = Settings()
