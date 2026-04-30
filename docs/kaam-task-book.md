# KAAM（Know All About Me）任务书

## 项目定位

KAAM 是一个面向轻社交、活动互动、趣味测试与知识问答场景的在线出题答题平台。用户可通过网页端快速创建题库、生成分享码并邀请他人作答，系统支持自动评分、称号判定及 AI 辅助出题。

## 核心目标

- 支持用户创建题库并生成唯一分享码。
- 支持答题人输入分享码进入答题流程。
- 支持服务端评分、称号匹配和结果展示。
- 支持 AI 批量生成题目、单题补全和题目优化。
- 支持题库修改、删除和管理口令校验。
- 支持基础防滥用、AI 限流和异常降级。

## 技术路线

- 前端：HTML5、CSS3、原生 JavaScript。
- 云端：腾讯云 CloudBase 静态托管、云数据库、云函数。
- AI：第三方大模型 API，通过云函数中转。

## 架构原则

- 前端只负责交互展示，不承载敏感安全逻辑。
- 云函数负责鉴权、评分、AI 中转、限流和敏感数据处理。
- 数据库按公开数据与敏感数据分层设计。
- 所有关键写操作均通过云函数执行。
- AI 是增强功能，失败时不影响手动出题、答题和评分主流程。

## 页面范围

- `index.html`：首页入口。
- `create.html`：出题页。
- `answer.html`：答题页。
- `result.html`：结果页。
- `manage.html`：题库管理页。
- `help.html`：使用说明页。

## 云函数接口预留

### createQuestionBank

负责校验题库参数、处理管理口令、生成唯一分享码并保存题库。

### getQuestionBank

负责按分享码读取题库公开信息，不返回管理口令哈希和标准答案等敏感字段。

### submitAnswer

负责接收用户答案、服务端评分、匹配称号、保存答题记录并返回结果。

### manageQuestionBank

负责校验管理口令，并执行题库读取、更新或软删除。

### aiProxy

负责 AI 参数校验、限流、调用第三方模型、清洗 JSON 响应并返回结构化题目。

## 数据模型摘要

### question_bank

- `share_code`：唯一分享码。
- `creator_name`：出题人昵称。
- `creator_pwd_hash`：管理口令哈希。
- `title`：题库标题。
- `description`：题库描述。
- `question_list`：题目数组。
- `rank_rule`：称号规则。
- `total_score`：总分。
- `status`：`active` / `deleted` / `disabled`。
- `create_time`：创建时间戳。
- `update_time`：更新时间戳。
- `ai_generated_count`：AI 生成题目数量统计。

### answer_record

- `share_code`：所属题库分享码。
- `answer_name`：答题人昵称。
- `user_answer`：用户答案列表。
- `score`：得分。
- `correct_count`：正确题数。
- `wrong_count`：错误题数。
- `rank_name`：称号。
- `submit_time`：提交时间戳。

### ai_limit

- `user_key`：用户标识。
- `date`：日期。
- `count`：当日调用次数。
- `update_time`：最近更新时间。

## 安全要求

- 不在前端暴露 AI Key。
- 不在前端执行管理口令校验、评分等敏感逻辑。
- 标准答案正式环境不通过公开接口返回。
- 题库、答题记录、AI 限流表默认不允许前端任意写入。
- AI 调用、题库创建、提交答案都需要输入长度和频率限制。

## 前端当前实现策略

第一版前端提供完整页面与交互骨架，并集中预留后端接口。正式接入 CloudBase 前，页面默认使用本地 LocalStorage mock 数据，方便离线开发和演示。切换到云函数时，只需在 `js/common.js` 中开启远程 API 并配置 CloudBase 调用逻辑。
