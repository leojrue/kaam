import argparse
import sys
import webbrowser
from pathlib import Path


SERVER_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SERVER_DIR.parent
sys.path.insert(0, str(SERVER_DIR))

from app.config import settings  # noqa: E402
from app.database import create_connection  # noqa: E402


RESET_TABLES = ("answer_records", "question_banks", "ai_limits")
COUNT_TABLES = ("users", "question_banks", "answer_records", "ai_limits")


def clear_database():
    connection = create_connection(use_database=True)
    try:
        with connection.cursor() as cursor:
            for table in RESET_TABLES:
                cursor.execute(f"DELETE FROM {table}")
                cursor.execute(f"ALTER TABLE {table} AUTO_INCREMENT = 1")
        connection.commit()

        counts = {}
        with connection.cursor() as cursor:
            for table in COUNT_TABLES:
                cursor.execute(f"SELECT COUNT(*) AS count FROM {table}")
                counts[table] = cursor.fetchone()["count"]
        return counts
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description="清空 KAAM 测试数据并重置浏览器测试状态。")
    parser.add_argument(
        "--open-browser",
        action="store_true",
        help="清空数据库后自动打开浏览器重置页。"
    )
    args = parser.parse_args()

    counts = clear_database()
    reset_url = f"{settings.app_base_url}/reset.html"

    print("数据库测试记录已清空：")
    for table, count in counts.items():
        print(f"- {table}: {count}")

    print("\n浏览器状态重置：")
    print(f"- 打开 {reset_url}")
    print("- 该页面会清除 localStorage/sessionStorage 中的 KAAM 测试状态，然后自动返回首页。")

    if args.open_browser:
        webbrowser.open(reset_url)


if __name__ == "__main__":
    main()
