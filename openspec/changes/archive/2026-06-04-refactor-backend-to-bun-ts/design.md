## Context

当前项目是 React/Vite 前端 + Python FastAPI 后端。后端代码量不大，但几乎所有行为都集中在 `backend/main.py`：路由、全局游戏状态、剧本读取、Prompt 拼装、OpenAI-compatible LLM 调用、SSE 流式输出、线索搜索、轮次推进、指认、撤回重发。

这个结构作为朋友做出的原型是可以理解的，但它现在已经成为主要维护风险。你更熟悉 TypeScript 生态，也希望用 TS-agent 相关工具继续推进项目，所以后端迁移到 Bun/TypeScript 是合理的。迁移的重点不是“换语言”，而是借迁移机会建立清晰模块边界。

当前游戏是单人单局。进程内全局 `GameState` 暂时够用，但设计上不能把这个选择写死在业务规则里，否则后续加多局、存档、session 会很痛苦。

## Goals / Non-Goals

**Goals:**

- 将后端迁移到 Bun + TypeScript。
- 保持当前 API 路由、请求结构、响应结构和前端可见行为兼容。
- 明确拆分后端职责，让核心逻辑可测试。
- 继续使用 `Script/manifest.json` 和 NPC 文本文件作为剧本内容来源。
- 把 LLM Provider 细节隔离到适配器中，方便切换 SiliconFlow、PiAPI、OpenAI-compatible 服务等。
- 保留当前 SSE 流式输出格式。
- 为请求、manifest、内部状态转换增加运行时校验。
- 为后续 session、存档、数据库持久化预留结构，但本次不实现。

**Non-Goals:**

- 不重做前端 UI。
- 不改变当前游戏规则、线索顺序、胜负逻辑、轮次/天数推进。
- 不在本次加入多用户 session 或数据库持久化。
- 不重写 Prompt 策略，只把 Prompt 构建从主文件中抽出来。
- 不在第一阶段强制 LLM 输出 JSON。
- 不在本次构建完整 NPC agent 框架。

## Decisions

### Decision 1: 使用 Bun + Hono + Zod

后端运行时使用 Bun，HTTP 路由层使用 Hono，运行时数据校验使用 Zod。

理由：
- Bun 可以直接运行 TypeScript，并且内置 `fetch`、stream、server 能力。
- Hono 很轻，和 fetch-style request/response 模型贴合，适合这个规模的 API server。
- Zod 可以校验请求体和剧本 manifest。TypeScript 只能做编译期检查，不能保证运行时 JSON 内容正确。

考虑过的替代方案：
- Elysia：Bun 原生体验更强，但框架表面积比当前项目需要的更大。
- Express/Fastify + Node：成熟，但和你想使用 Bun 的方向不一致。
- 继续 FastAPI，只模块化 Python：迁移风险最低，但无法解决你不熟 Python 生态的问题。

### Decision 2: 第一阶段优先保持 API 兼容

Bun 后端第一版应实现当前所有路由：

- `GET /api/info`
- `GET /api/state`
- `POST /api/new-game`
- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/select-npc`
- `POST /api/accuse`
- `POST /api/search`
- `POST /api/undo-and-resend`

理由：
- 前端可以基本不动，降低迁移风险。
- 可以针对现有 API 合约写兼容测试。
- 把“后端重构”和“玩法改造”分开，避免一次改太多。

考虑过的替代方案：
- 现在就设计新 API：长期可能更干净，但会强迫前端一起大改。
- 删除非流式 `/api/chat`：前端主要走 stream，但非流式接口仍然可以作为 fallback 和调试入口。

### Decision 3: 后端按职责拆模块，共享类型放项目根

建议目标结构：

```text
shared/                        ← 前后端共享类型（项目根）
  types.ts

backend-ts/
  package.json
  tsconfig.json
  src/
    server.ts
    app.ts
    config.ts
    routes/
      info.ts
      state.ts
      chat.ts
      search.ts
      accuse.ts
    game/
      engine.ts
      store.ts
      types.ts
      snapshots.ts
    script/
      repository.ts
      schemas.ts
      types.ts
    llm/
      client.ts
      providers.ts
      prompts.ts
      parser.ts
      stream.ts
```

模块职责：

- `shared/types.ts`：前后端共用的 TypeScript 类型定义（GameState、ScriptInfo、ChatResponse 等），放在项目根以保持单一真实来源。前端通过 Vite alias、后端通过 tsconfig paths 引用。
- `routes/`：只处理 HTTP 输入输出，不写复杂业务。
- `game/engine.ts`：负责游戏规则，包括轮次推进、重置、NPC 切换、搜索、指认、撤回重发。
- `script/repository.ts`：负责读取和校验 manifest、NPC 文本。
- `llm/`：负责 Provider 调用、Prompt 构建、输出解析、流式转换。
- `store.ts`：隐藏状态存储方式。第一阶段是内存，后续可以换成 session 或 SQLite。

考虑过的替代方案：
- 先把 Python 单文件平移成一个 TypeScript 文件：最快，但会把当前维护问题原封不动搬过去。
- 做很重的领域驱动分层：对当前项目规模来说过度设计。
- 共享类型放 `backend-ts/src/shared/`：简单但前端引用不便，不如根 `shared/` 直接。

### Decision 4: 先保留内存状态，但放在 Store 接口后

第一阶段仍然使用内存状态，行为和当前全局 `game_state` 等价。但所有读写都通过 `GameStore` 接口完成。

理由：
- 当前前端没有 `sessionId`，直接做多 session 会扩大变更范围。
- Store 接口可以让后续接 SQLite、文件存档或多用户 session 时少改路由。
- 迁移阶段保持小步可验证。

考虑过的替代方案：
- 立即加 SQLite：有价值，但会带来存档格式、迁移、并发、恢复等额外问题。
- 把游戏状态放浏览器：不适合，因为会暴露剧本秘密和 Prompt。

### Decision 5: LLM 调用统一走 Provider Adapter

业务代码不直接依赖 OpenAI SDK 或 PiAPI SDK，而是调用内部 `LlmClient` 接口。

建议接口形状：

```ts
interface LlmClient {
  complete(input: LlmCompletionInput): Promise<LlmCompletionResult>;
  stream(input: LlmCompletionInput): AsyncIterable<string>;
}
```

理由：
- 当前后端已经是 OpenAI-compatible `base_url` 模式，抽象成本低。
- 以后切 SiliconFlow、PiAPI、OpenAI、Ollama-compatible 服务都不会影响游戏规则。
- 测试时可以用 fake LLM client，避免真实调用模型。

考虑过的替代方案：
- 到处直接用 OpenAI SDK：初期简单，但 Provider 细节会散落在业务代码里。
- 现在引入完整 agent 框架：对当前单人剧本杀引擎来说过早。

### Decision 6: 迁移阶段保留当前文本解析协议

第一版 Bun 后端继续解析：

- `思考过程：`
- `NPC回复：`
- `正文：`

解析逻辑放到 `llm/parser.ts`，并补测试覆盖完整输出、缺少字段、格式异常等情况。

理由：
- 能最大程度保留当前 Prompt 和前端流式解析行为。
- 把脆弱点集中到一个模块里，后续更容易替换。
- JSON 结构化输出可以作为之后单独的行为变更。

考虑过的替代方案：
- 立刻切 JSON 输出：长期更稳，但会同时改变 Prompt、解析、错误处理和模型行为，不适合和后端迁移混在一起。

### Decision 7: 保持前端 SSE 格式不变

`/api/chat/stream` 继续输出当前前端能解析的格式：

```text
data: {"type":"token","content":"..."}

data: {"type":"done","prompt":"...","state":{...}}
```

如果轮次推进导致游戏结束，继续输出：

```text
data: {"type":"game_over","state":{...}}
```

理由：
- `frontend/src/api.ts` 当前是手动读取 `ReadableStream`，按 `data: ` 行解析。
- 改 SSE 事件格式会导致前端一起变更，超出第一阶段目标。

考虑过的替代方案：
- 使用命名 SSE event：更规范，但会要求改前端解析器。

### Decision 8: 配置使用 config.toml 模板模式

后端配置统一使用 TOML 文件，不再依赖分散的环境变量。

- `config.example.toml`：提交到仓库，包含所有配置项的占位说明
- `config.toml`：运行时实际配置，由开发者从模板复制生成，加入 `.gitignore`
- 初始化脚本自动检测 `config.toml` 是否存在，不存在则从模板复制

配置结构示例：

```toml
[server]
port = 8000
host = "0.0.0.0"

[llm]
provider = "openai-compatible"
api_key = "sk-your-key-here"
base_url = "https://api.siliconflow.cn/v1"
model = "qwen-max"
temperature = 0.0

[game]
script_dir = "../Script"
```

理由：
- TOML 结构化分组，比 `.env` 扁平命名空间更适合多模块配置。
- 模板模式避免敏感信息（API key）被提交到 git。
- 所有配置（端口、LLM 参数、路径）一份文件，部署和调试时一目了然。
- 可以用 Zod schema 在启动时做完整校验，而不是等到调用时才报错。

考虑过的替代方案：
- 继续用 `.env` + `os.getenv`：当前方式，但字段多了以后维护困难。
- JSON 配置：不如 TOML 注释友好和手写干净。
- 纯代码内配置：不方便不同环境切换。

## Risks / Trade-offs

- API 兼容性漂移 -> 给路由响应结构写测试，第一阶段尽量不改前端。
- 流式输出回归 -> 测试 SSE 行格式，并手动验证前端流式 UI。
- 撤回重发出错 -> 单测覆盖快照恢复、故事裁剪、线索裁剪、当前 NPC 恢复、聊天历史截断。
- LLM 输出解析脆弱 -> 先隔离并测试 parser，结构化 JSON 输出放到后续变更。
- 配置格式迁移 -> `.env` 到 `config.toml` 的字段名变化需要在 README 和初始化脚本中明确说明，避免开发者混淆。Zod 校验在启动时报错保证即时反馈。
- Bun 特有能力绑定过深 -> 除 server 启动和文件读取外，尽量使用标准 `fetch`、`Response`、`ReadableStream`。
- 迁移中顺手改玩法导致失控 -> 本次不改线索规则、指认逻辑、Prompt 内容和前端 UI。

## Migration Plan

1. 创建 `backend-ts/`，配置 Bun、TypeScript、Hono、Zod 和测试工具。
2. 创建 `shared/types.ts`，从现有 `frontend/src/types.ts` 抽取共用类型，前后端通过 paths alias 引用。
3. 创建 `config.example.toml` 模板和 Zod 校验，初始化脚本自动复制为 `config.toml`。
4. 实现 manifest 与 NPC 文本读取，并使用 Zod 校验。
5. 实现 `GameStore` 和 `GameEngine`，保持与 Python 后端等价的行为。
6. 实现 Prompt 构建和 LLM 输出解析。
7. 实现 OpenAI-compatible `LlmClient`，包括非流式和流式调用。
8. 实现所有 `/api/*` 路由和 SSE 输出。
9. 运行后端测试和前端 build。
10. 更新 Vite proxy（加入 shared/ alias）、启动脚本和 README。
11. 在 Bun 后端通过兼容验证前，保留 Python 后端；验证完成后再删除或归档。

回滚策略：
- Bun 后端验证完成前不动 Python 后端。
- 如果 Bun 后端阻塞游玩，恢复 Vite proxy 和启动脚本到 Python `localhost:8000` 服务。

## Open Questions

- 现有 `SF_*` 环境变量是否继续作为主命名？还是引入 `LLM_*` 并兼容旧命名？
  - **已决策**：改用 `config.toml`，字段名按 `[llm]` 分组，不再使用 `SF_*` 前缀。
- `thinking` 是否继续返回给前端？它对调试有用，但可能暴露剧情推理和隐藏信息。
  - **已决策**：迁移时不把 `thinking` 写入前端可见的响应。移除 `ChatResponse.thinking`，`StoryPanel` 不再展示思考内容。后续可单独加调试开关。
