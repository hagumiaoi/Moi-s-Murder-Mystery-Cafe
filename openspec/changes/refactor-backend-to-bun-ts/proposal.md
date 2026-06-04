## Why

当前后端几乎全部集中在一个 FastAPI 文件里：HTTP 路由、游戏状态、剧本读取、Prompt 拼装、LLM 调用、流式输出、线索搜索、指认和撤回重发都混在一起。这个结构适合快速原型，但继续扩展会越来越难维护。

这次变更的目标是把后端迁移到 Bun + TypeScript，并在迁移过程中完成模块化拆分。这样可以利用你更熟悉的 TS/agent 生态继续开发，同时尽量不改变现有玩家体验。

## What Changes

- 用 Bun + TypeScript 后端替代当前 Python FastAPI 后端。
- 保持现有 `/api/*` 路由和返回结构兼容，避免第一阶段大改前端。
- 拆分后端职责：路由层、游戏引擎、剧本仓库、LLM Provider 适配器、Prompt 构建、输出解析、状态存储。
- 使用 TypeScript 类型和运行时校验约束请求、游戏状态、剧本 manifest、LLM 适配边界。
- 第一阶段保留当前“单人单局、内存状态”的行为，但把状态访问隔离到 Store 接口后面，方便后续加 session 或持久化。
- 保留 `/api/chat/stream` 当前的 SSE 流式输出格式。
- 通过配置支持 OpenAI-compatible LLM Provider，包括当前 SiliconFlow 风格的 `base_url` 配置，以及后续 PiAPI 风格 Provider。
- 增加针对游戏规则、LLM 输出解析、API 兼容性、SSE 格式的聚焦测试。
- Bun 后端达到兼容后，再移除或归档 Python 后端运行依赖。

## Capabilities

### New Capabilities

- `backend-api-compatibility`: 约束 Bun 后端必须保留给现有前端使用的 HTTP API 与流式 API 行为。
- `modular-game-backend`: 约束后端模块边界和游戏规则行为，确保重构后可维护、可测试。
- `llm-provider-adapter`: 约束后端如何调用 OpenAI-compatible Provider，并隔离 Provider 细节。

### Modified Capabilities

无。当前 `openspec/specs/` 中没有已有归档规格。

## Impact

- 影响代码：
  - `backend/` 会被 Bun/TypeScript 后端替代或逐步废弃。
  - `frontend/src/api.ts` 在兼容迁移阶段应尽量不改或只做极小调整。
  - 如果后端端口变化，需要更新 `frontend/vite.config.ts` 的代理目标。
  - `start.ps1` 和 README 启动说明需要更新。
- 依赖：
  - 增加 Bun 后端依赖，建议使用 Hono 和 Zod。
  - React/Vite 前端依赖先保持不变。
- API：
  - `/api/info`、`/api/state`、`/api/new-game`、`/api/chat`、`/api/chat/stream`、`/api/select-npc`、`/api/accuse`、`/api/search`、`/api/undo-and-resend` 必须保持兼容。
- 系统：
  - `Script/manifest.json` 和 NPC 文本文件仍然是剧本内容来源。
  - 环境变量仍然用于 LLM 配置；迁移时可以兼容现有 `SF_*`，并逐步引入更通用的 `LLM_*` 命名。
