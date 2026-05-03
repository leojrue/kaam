import importlib
import shutil
import socket
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SERVER_ROOT = Path(__file__).resolve().parent
FRONTEND_FILES = [
    "index.html",
    "create.html",
    "answer.html",
    "result.html",
    "manage.html",
    "help.html",
    "css/style.css",
    "js/common.js",
    "js/tools.js",
    "js/create.js",
    "js/answer.js",
    "js/result.js",
    "js/manage.js",
]
PYTHON_PACKAGES = [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("sqlalchemy", "sqlalchemy"),
    ("pymysql", "pymysql"),
    ("pydantic", "pydantic"),
    ("passlib", "passlib"),
    ("python-dotenv", "dotenv"),
    ("httpx", "httpx"),
]
MYSQL_TABLES = ["question_banks", "answer_records", "ai_limits"]


def print_result(ok, label, detail=""):
    prefix = "OK" if ok else "FAIL"
    message = f"[{prefix}] {label}"
    if detail:
        message += f" - {detail}"
    print(message)
    return ok


def check_file_exists(relative_path):
    path = PROJECT_ROOT / relative_path
    return print_result(path.exists(), f"文件存在: {relative_path}")


def check_python_package(package_name, import_name):
    try:
        module = importlib.import_module(import_name)
        version = getattr(module, "__version__", "unknown")
        return print_result(True, f"Python 依赖: {package_name}", f"version={version}")
    except Exception as error:
        return print_result(False, f"Python 依赖: {package_name}", str(error))


def check_command(command):
    path = shutil.which(command)
    return print_result(bool(path), f"命令可用: {command}", path or "not found")


def run_command(command, label, cwd=PROJECT_ROOT):
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            capture_output=True,
            timeout=20,
            check=False,
        )
        detail = completed.stderr.strip() or completed.stdout.strip()
        return print_result(completed.returncode == 0, label, detail[:240])
    except Exception as error:
        return print_result(False, label, str(error))


def check_js_syntax():
    if not shutil.which("node"):
        return print_result(False, "前端 JS 语法检查", "node 命令不存在")

    ok = True
    for relative_path in [
        "js/common.js",
        "js/tools.js",
        "js/create.js",
        "js/answer.js",
        "js/result.js",
        "js/manage.js",
    ]:
        ok = run_command(["node", "--check", relative_path], f"JS 语法: {relative_path}") and ok
    return ok


def check_port(host, port):
    try:
        with socket.create_connection((host, port), timeout=3):
            return print_result(True, f"端口连通: {host}:{port}")
    except Exception as error:
        return print_result(False, f"端口连通: {host}:{port}", str(error))


def load_backend_modules():
    sys.path.insert(0, str(SERVER_ROOT))
    modules = [
        "app.config",
        "app.database",
        "app.schemas",
        "app.routers.question_banks",
        "app.routers.answers",
        "app.routers.ai",
        "app.services.question_bank_service",
        "app.services.answer_service",
        "app.services.ai_service",
    ]
    ok = True
    for module_name in modules:
        try:
            importlib.import_module(module_name)
            print_result(True, f"后端模块导入: {module_name}")
        except Exception as error:
            ok = False
            print_result(False, f"后端模块导入: {module_name}", str(error))
    return ok


def check_fastapi_app():
    sys.path.insert(0, str(SERVER_ROOT))
    try:
        from app import app

        route_count = len(app.routes)
        return print_result(True, "FastAPI 应用加载", f"routes={route_count}")
    except Exception as error:
        return print_result(False, "FastAPI 应用加载", str(error))


def check_mysql():
    sys.path.insert(0, str(SERVER_ROOT))
    try:
        from app.config import settings
        from app.database import create_connection, initialize_database

        host = settings.mysql_host
        port = settings.mysql_port
        check_port(host, port)
        initialize_database()
        connection = create_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT DATABASE() AS db_name")
                db_name = cursor.fetchone()["db_name"]
                print_result(True, "MySQL 数据库连接", f"database={db_name}")

                ok = True
                for table_name in MYSQL_TABLES:
                    cursor.execute("SHOW TABLES LIKE %s", (table_name,))
                    exists = cursor.fetchone() is not None
                    ok = print_result(exists, f"MySQL 表存在: {table_name}") and ok
                return ok
        finally:
            connection.close()
    except Exception as error:
        return print_result(False, "MySQL 检查", str(error))


def main():
    checks = []
    print("KAAM 环境自检开始")
    print(f"项目目录: {PROJECT_ROOT}")
    print(f"Python: {sys.executable}")

    checks.append(print_result(sys.version_info >= (3, 10), "Python 版本", sys.version.split()[0]))

    for relative_path in FRONTEND_FILES:
        checks.append(check_file_exists(relative_path))

    checks.append(check_command("node"))
    checks.append(check_js_syntax())

    for package_name, import_name in PYTHON_PACKAGES:
        checks.append(check_python_package(package_name, import_name))

    checks.append(check_file_exists("server/requirements.txt"))
    checks.append(check_file_exists("server/sql/init.sql"))
    checks.append(check_file_exists("server/.env.example"))
    checks.append(load_backend_modules())
    checks.append(check_fastapi_app())
    checks.append(check_mysql())

    passed_count = sum(1 for item in checks if item)
    total_count = len(checks)
    print(f"KAAM 环境自检完成: {passed_count}/{total_count} 项通过")

    if passed_count != total_count:
        sys.exit(1)


if __name__ == "__main__":
    main()
