import pymysql

from app.config import settings


CREATE_TABLE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      account VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_text VARCHAR(8) NOT NULL DEFAULT '',
      create_time BIGINT NOT NULL,
      update_time BIGINT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_account (account)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS question_banks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      share_code VARCHAR(16) NOT NULL,
      creator_name VARCHAR(50) NOT NULL,
      creator_pwd_hash VARCHAR(255) NOT NULL,
      title VARCHAR(100) NOT NULL,
      description VARCHAR(500) DEFAULT '',
      question_list JSON NOT NULL,
      rank_rule JSON NOT NULL,
      total_score INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      create_time BIGINT NOT NULL,
      update_time BIGINT NOT NULL,
      ai_generated_count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_share_code (share_code),
      KEY idx_user_id (user_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS answer_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      share_code VARCHAR(16) NOT NULL,
      answer_name VARCHAR(50) NOT NULL,
      device_id VARCHAR(128) DEFAULT '',
      user_answer JSON NOT NULL,
      score INT NOT NULL DEFAULT 0,
      correct_count INT NOT NULL DEFAULT 0,
      wrong_count INT NOT NULL DEFAULT 0,
      rank_name VARCHAR(50) NOT NULL DEFAULT '',
      submit_time BIGINT NOT NULL,
      PRIMARY KEY (id),
      KEY idx_share_code (share_code),
      KEY idx_submit_time (submit_time),
      UNIQUE KEY uk_share_device (share_code, device_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS ai_limits (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_key VARCHAR(128) NOT NULL,
      date VARCHAR(10) NOT NULL,
      count INT NOT NULL DEFAULT 0,
      update_time BIGINT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_date (user_key, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
]


MIGRATION_STATEMENTS = [
    "ALTER TABLE question_banks ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id",
    "ALTER TABLE question_banks ADD KEY idx_user_id (user_id)",
    "ALTER TABLE answer_records ADD COLUMN device_id VARCHAR(128) DEFAULT '' AFTER answer_name",
    "ALTER TABLE answer_records ADD UNIQUE KEY uk_share_device (share_code, device_id)"
]


def create_connection(use_database=True):
    return pymysql.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        database=settings.mysql_database if use_database else None,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )


def initialize_database():
    connection = create_connection(use_database=False)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        connection.commit()
    finally:
        connection.close()

    connection = create_connection(use_database=True)
    try:
        with connection.cursor() as cursor:
            for statement in CREATE_TABLE_STATEMENTS:
                cursor.execute(statement)
            for statement in MIGRATION_STATEMENTS:
                try:
                    cursor.execute(statement)
                except pymysql.err.OperationalError as error:
                    if error.args[0] not in (1060, 1061):
                        raise
            cursor.execute("SELECT id FROM users WHERE account = %s", ("leo",))
            existing_user = cursor.fetchone()
            if not existing_user:
                from app.utils.security import hash_password
                now = 0
                cursor.execute(
                    """
                    INSERT INTO users (account, password_hash, avatar_text, create_time, update_time)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    ("leo", hash_password("1234"), "L", now, now)
                )
        connection.commit()
    finally:
        connection.close()
