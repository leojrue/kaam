# KAAM

Know All About Me（KAAM）是一个轻量化 AI 互动出题答题平台，覆盖“出题、分享、答题、评分、结果展示”的基础闭环。

## 当前状态

本仓库已完成前端静态页面骨架，并已按传统云服务器后端方案预留接口：

- 首页入口
- 出题编辑
- 答题提交
- 结果展示
- 题库管理
- 使用说明
- Python FastAPI REST API 接口预留
- 本地 LocalStorage mock 数据兜底

## 目录结构

```bash
.
├── index.html
├── create.html
├── answer.html
├── result.html
├── manage.html
├── help.html
├── css
├── js
├── assets
├── server
└── docs
```

## 本地预览

静态页面可以直接打开 `index.html` 体验。为了更接近线上环境，也可以在项目根目录启动任意静态服务器。

## 后端接入

所有后端接口统一封装在 `js/common.js` 的 `KaamApi` 中。当前默认使用本地 mock；接入 Python FastAPI 后端后，将 `API_MODE` 从 `mock` 改为 `remote` 即可走 `/api` 接口。

计划后端技术栈：

- Python + FastAPI
- MySQL
- Nginx
- systemd

新版任务书见 `docs/kaam-traditional-server-task-book.md`。
