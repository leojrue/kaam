# KAAM（Know All About Me）
## 轻量化 AI 互动出题答题平台
### 传统云服务器后端落地方案 v3.1（Python + FastAPI + MySQL）

## 1. 项目定位

KAAM 是一个面向轻社交、活动互动、趣味测试与知识问答场景的在线出题答题平台。用户可通过网页端快速创建题库、生成分享码并邀请他人作答，系统支持自动评分、称号判定及 AI 辅助出题。

本版本保持前端页面、核心业务流程和用户体验不变，仅将后端架构从 Serverless 云函数调整为传统云服务器部署：

```text
前端静态站点 + Nginx + Python FastAPI 后端 + MySQL + 第三方 AI API
```

## 2. 建设目标

- 用户创建题库并生成唯一分享码。
- 用户输入分享码进入答题流程。
- 系统自动评分并匹配称号。
- 支持 AI 批量生成题目、单题补全与题目优化。
- 支持题库修改、删除及权限校验。
- 支持基础防滥用、AI 限流及异常降级。
- 使用传统服务器部署，便于 SSH 连接、日志查看、接口调试和代码维护。

## 3. 总体架构

```text
用户浏览器
  ↓
服务器公网 IP / 域名
  ↓
Nginx
  ├─ /       → 前端静态文件
  └─ /api/*  → Python FastAPI 后端
                ↓
              MySQL / 第三方 AI API
```

## 4. 技术选型

### 前端

- HTML5
- CSS3
- 原生 JavaScript

### Web 入口

- Nginx
- 静态资源托管
- `/api` 反向代理
- HTTPS 证书入口

### 后端

- Python 3.10+
- FastAPI
- Uvicorn
- SQLAlchemy
- PyMySQL
- Pydantic
- passlib[bcrypt]
- python-dotenv
- httpx

### 数据库

- MySQL 8.x
- 字符集：`utf8mb4`
- 排序规则：`utf8mb4_unicode_ci`

## 5. 项目结构

```bash
/项目根目录
├── index.html
├── create.html
├── answer.html
├── result.html
├── manage.html
├── help.html
├── css
│   └── style.css
├── js
│   ├── common.js
│   ├── tools.js
│   ├── create.js
│   ├── answer.js
│   ├── result.js
│   └── manage.js
├── assets
├── docs
│   ├── kaam-task-book.md
│   └── kaam-traditional-server-task-book.md
└── server
    ├── README.md
    ├── requirements.txt
    ├── .env.example
    ├── app.py
    ├── app
    │   ├── __init__.py
    │   ├── config.py
    │   ├── database.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── routers
    │   ├── services
    │   └── utils
    └── sql
        └── init.sql
```

当前阶段只搭建前端适配层和后端目录骨架，暂不实现后端业务代码。

## 6. 前后端接口约定

后端统一使用 `/api` 前缀，前端统一通过 `js/common.js` 中的 `KaamApi` 调用。

### 创建题库

```http
POST /api/question-banks
```

请求：

```json
{
  "creatorName": "Leo",
  "creatorPassword": "123456",
  "title": "你真的了解我吗",
  "description": "趣味测试",
  "questionList": [],
  "rankRules": [],
  "aiGeneratedCount": 0
}
```

返回：

```json
{
  "success": true,
  "data": {
    "shareCode": "K8D3XQ",
    "shareUrl": "https://example.com/answer.html?code=K8D3XQ"
  }
}
```

### 获取公开题库

```http
GET /api/question-banks/{shareCode}
```

返回不得包含：

- `creatorPwdHash`
- `creator_pwd_hash`
- `answer`
- AI 密钥或限流内部字段

### 提交答案

```http
POST /api/answers/submit
```

请求：

```json
{
  "shareCode": "K8D3XQ",
  "answerName": "小明",
  "userAnswer": ["A", "C", "D"]
}
```

### 管理题库

```http
POST /api/question-banks/manage
```

请求：

```json
{
  "action": "get",
  "shareCode": "K8D3XQ",
  "creatorPassword": "123456"
}
```

支持动作：

- `get`
- `update`
- `delete`

### AI 生成题目

```http
POST /api/ai/generate
```

请求：

```json
{
  "action": "generate",
  "topic": "校园生活",
  "count": 5
}
```

## 7. 变量命名规范

### 前端 JavaScript

- 变量和函数使用 `camelCase`。
- 常量配置使用 `UPPER_SNAKE_CASE`。
- DOM 元素变量使用 `xxxElement` 或明确控件名，如 `shareCodeInput`。
- API 入参与出参使用面向前端的 `camelCase`。

示例：

```js
const API_BASE_URL = "/api";
const shareCodeInput = document.querySelector("#shareCodeInput");

async function createQuestionBank(payload) {}
```

### 后端 Python

- Python 变量、函数、模块名使用 `snake_case`。
- Pydantic Schema 字段可接收前端 `camelCase`。
- 数据库字段使用 `snake_case`。
- API JSON 对外返回优先使用 `camelCase`，减少前端转换成本。

### MySQL

- 表名使用复数或业务名下划线：`question_banks`、`answer_records`、`ai_limits`。
- 字段名使用 `snake_case`。
- 分享码字段 `share_code` 建唯一索引。

## 8. MySQL 表设计

### question_banks

```sql
CREATE TABLE question_banks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
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
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### answer_records

```sql
CREATE TABLE answer_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  share_code VARCHAR(16) NOT NULL,
  answer_name VARCHAR(50) NOT NULL,
  user_answer JSON NOT NULL,
  score INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  rank_name VARCHAR(50) NOT NULL DEFAULT '',
  submit_time BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_share_code (share_code),
  KEY idx_submit_time (submit_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ai_limits

```sql
CREATE TABLE ai_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_key VARCHAR(128) NOT NULL,
  date VARCHAR(10) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  update_time BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_date (user_key, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 9. 安全要求

- 前端不得保存或展示 AI Key。
- 前端不得通过公开接口获取标准答案。
- 管理口令必须由后端使用 bcrypt 哈希存储。
- 所有创建、修改、删除、评分、AI 调用均由后端完成。
- 数据库不得暴露公网直连给前端。
- AI 接口必须限流。
- 删除题库采用软删除：`status = deleted`。

## 10. 部署思路

```text
/var/www/kaam      → 前端静态文件
/opt/kaam/server   → FastAPI 后端
MySQL              → 本机或独立数据库
Nginx              → 静态站点 + /api 代理
systemd            → 托管 FastAPI 进程
```

Nginx 路由：

```text
/      → /var/www/kaam
/api/  → http://127.0.0.1:8000/api/
```

## 11. 当前前端适配策略

`js/common.js` 保留本地 mock 能力，方便后端未完成前继续演示；同时预留 REST API 调用层。后续后端完成后，只需要将：

```js
const API_MODE = "mock";
```

改为：

```js
const API_MODE = "remote";
```

即可切换到真实后端。
