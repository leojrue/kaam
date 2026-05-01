# KAAM Python Backend

当前目录为传统云服务器后端预留结构，目标技术栈：

- Python 3.10+
- FastAPI
- Uvicorn
- SQLAlchemy
- PyMySQL
- MySQL 8.x

当前阶段只保留架构骨架，暂不实现后端业务逻辑。

## API 前缀

```text
/api
```

## 计划接口

```text
POST /api/question-banks
GET  /api/question-banks/{shareCode}
POST /api/answers/submit
POST /api/question-banks/manage
POST /api/ai/generate
```
