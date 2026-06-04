## 1. 后端脚手架

- [x] 1.1 创建 `backend-ts/`，配置 Bun、TypeScript、Hono、Zod、lint/test 脚本和基础项目配置
- [x] 1.2 添加 `server.ts` 和 `app.ts`，实现服务启动和 `/api` 路由挂载
- [x] 1.3 创建 `config.example.toml` 模板（server/llm/game 分组），定义 Zod 校验 schema
- [x] 1.4 在 `backend-ts/` 添加初始化脚本：自动检测 `config.toml` 不存在时从模板复制
- [x] 1.5 将 `config.toml` 加入 `.gitignore`
- [x] 1.6 创建项目根 `shared/` 目录和 `shared/types.ts`，从 `frontend/src/types.ts` 抽取共用类型

## 2. 类型与校验

- [x] 2.1 完善 `shared/types.ts`：定义 manifest、NPC、搜索地点、故事、聊天消息、线索、快照、游戏状态的 TypeScript 领域类型
- [x] 2.2 为 `config.toml` 结构和 `Script/manifest.json` 定义 Zod schema
- [x] 2.3 定义与当前前端 `types.ts` 兼容的 API 响应类型（放入 `shared/types.ts`）

## 3. 剧本 Repository

- [x] 3.1 实现从 `Script/manifest.json` 加载 manifest
- [x] 3.2 实现 NPC 文本文件加载，并保留当前缺失或空文件时的 fallback 文案
- [x] 3.3 在启动时校验真凶配置和首个 NPC 配置

## 4. 游戏引擎与 Store

- [x] 4.1 基于 Store 接口实现内存版 `GameStore`
- [x] 4.2 实现重置、状态序列化、NPC 切换、指认和轮次推进
- [x] 4.3 实现线索发现和"没有更多线索"的搜索行为
- [x] 4.4 实现快照创建与撤回重发回滚行为
- [x] 4.5 为轮次推进、超时、线索顺序、重复搜索、指认、撤回重发补单元测试

## 5. LLM 层

- [x] 5.1 实现 `config.ts`：读取并校验 `config.toml`（使用 Zod），通过 `[server]` / `[llm]` / `[game]` 分组暴露类型化配置
- [x] 5.2 实现 OpenAI-compatible 非流式 completion adapter
- [x] 5.3 实现 OpenAI-compatible 流式 adapter，输出纯文本 token
- [x] 5.4 抽出 NPC 聊天和搜索叙事 Prompt builder
- [x] 5.5 实现并测试 `thinking`/`reply`/`story` parser，覆盖完整输出和异常输出

## 6. API 路由

- [x] 6.1 实现 `GET /api/info` 和 `GET /api/state`
- [x] 6.2 实现 `POST /api/new-game`、`POST /api/select-npc` 和 `POST /api/accuse`
- [x] 6.3 实现 `POST /api/search`
- [x] 6.4 实现 `POST /api/chat`
- [x] 6.5 实现 `POST /api/chat/stream`，保留现有 SSE `data: {json}` 行格式
- [x] 6.6 增加路由级兼容测试，覆盖请求和响应结构

## 7. 前端与启动集成

- [x] 7.1 更新 Vite proxy 和 tsconfig paths，加入 `@shared` alias 指向 `shared/`
- [x] 7.2 更新 `start.ps1`：加入 `config.toml` 初始化步骤，启动 Bun 后端和 Vite 前端
- [x] 7.3 更新 README：安装步骤中加入 `cp config.example.toml config.toml`，说明各配置字段含义
- [x] 7.4 确认现有前端可以完成聊天、搜索、指认、重置、撤回重发流程

## 8. 清理

- [x] 8.1 在 Bun 后端兼容性验证完成前保留 Python 后端
- [x] 8.2 验证完成后删除或归档 Python 后端文件和依赖
- [x] 8.3 标记变更完成前运行后端测试、前端 build 和手动 smoke test
