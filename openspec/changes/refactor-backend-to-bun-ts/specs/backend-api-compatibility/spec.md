## ADDED Requirements

### Requirement: 现有 API 路由保持兼容
Bun 后端 SHALL 暴露当前 React 前端正在使用的相同 API 路由和 HTTP 方法。

#### Scenario: 前端获取初始游戏数据
- **WHEN** 前端请求 `GET /api/info` 和 `GET /api/state`
- **THEN** 后端 SHALL 返回与现有 `ScriptInfo` 和 `GameState` 前端类型兼容的 JSON

#### Scenario: 前端执行游戏操作
- **WHEN** 前端调用 `POST /api/new-game`、`POST /api/chat`、`POST /api/select-npc`、`POST /api/accuse`、`POST /api/search` 或 `POST /api/undo-and-resend`
- **THEN** 后端 SHALL 接受当前请求体结构，并返回与现有前端处理逻辑兼容的 JSON

### Requirement: 流式聊天保持兼容
Bun 后端 SHALL 保留当前 `/api/chat/stream` 使用的 server-sent event 格式。

#### Scenario: 模型流式输出聊天内容
- **WHEN** 前端调用 `POST /api/chat/stream`
- **THEN** 后端 SHALL 流式输出 `data: ` 行，其中 JSON 对象包含 `type: "token"` 和 `content` 字段

#### Scenario: 流式聊天正常结束
- **WHEN** 一次流式聊天响应成功完成
- **THEN** 后端 SHALL 输出最后一行 `data: `，其中 JSON 对象包含 `type: "done"`、更新后的 `state`，以及可用时的调试 `prompt`

#### Scenario: 流式聊天导致游戏结束
- **WHEN** 一次流式聊天请求导致游戏超过最大天数
- **THEN** 后端 SHALL 输出一行 `data: `，其中 JSON 对象包含 `type: "game_over"` 和更新后的 `state`

### Requirement: 前端代理保持兼容
迁移后的后端 SHALL 能被现有 Vite 开发服务器通过 `/api` 代理访问，最多只需要更新代理目标或启动命令。

#### Scenario: 开发者本地启动应用
- **WHEN** Bun 后端和 Vite 前端在本地运行
- **THEN** 前端发往 `/api` 的请求 SHALL 到达 Bun 后端，并且不需要修改前端组件逻辑
