## Context

后端当前的 `llm/client.ts` 直接构造 `Model<"openai-completions">`，并从 `[llm] provider/api_key/base_url/model/temperature` 读取单一模型。这种写法适合早期 OpenAI-compatible 代理，但没有利用 pi-ai 0.78.0 的内置 provider/model 注册表：`getProviders()`、`getModels(provider)`、`getModel(provider, model)` 和 provider 环境变量发现能力。

本项目仍运行在 Bun/Node 后端，LLM 调用集中在 `createLlmClient()`；前端和游戏逻辑不需要了解 provider 细节。配置迁移可以做成后端破坏式变更，不保留旧 `[llm]` 单模型字段兼容。

## Goals / Non-Goals

**Goals:**

- 用 pi-ai 内置 provider/model 作为常规模型解析路径。
- 支持在 `config.toml` 中声明多个模型 alias，并通过一个默认 alias 切换当前模型。
- 允许每个 alias 覆盖 `temperature`、`api_key`、`max_tokens` 等调用参数。
- 允许保留自定义 OpenAI-compatible 端点配置，但要求它显式标记为自定义模型档案。
- 保持现有 `complete`、`completeRaw`、`stream` 的业务接口不变。
- 在没有显式 key 且 provider 环境变量也不存在时，保留现有离线占位响应，避免测试或本地启动直接失败。

**Non-Goals:**

- 不新增前端模型切换 UI。
- 不新增运行时热切换 API；切换通过配置 `default_model` 或环境变量覆盖完成。
- 不实现 OAuth 登录流程；若 provider 需要 OAuth，仍按 pi-ai 自身机制配置。
- 不维护旧 `[llm] provider/api_key/base_url/model` 结构兼容。

## Decisions

### Decision 1: 使用 alias 驱动的模型档案

配置结构采用：

```toml
[llm]
default_model = "deepseek-chat"

[llm.models.deepseek-chat]
provider = "deepseek"
model = "deepseek-chat"
temperature = 0.7

[llm.models.siliconflow-deepseek-v3]
provider = "siliconflow"
model = "deepseek-ai/DeepSeek-V3"
api = "openai-completions"
base_url = "https://api.siliconflow.cn/v1"
api_key = ""
temperature = 0.7
```

理由：

- alias 是业务配置名，避免在调用点散落 provider/model 字符串。
- `default_model` 切换只改一个字段；也可以通过环境变量覆盖。
- 内置 provider 档案不需要 `base_url`、`api`、成本、上下文窗口等元数据。

替代方案：保留单一 `[llm]` 并增加数组字段。这个方案切换不直观，且不适合按 alias 引用。

### Decision 2: 内置模型优先，自定义模型显式化

若模型档案不包含 `base_url` 和 `api`，客户端使用 `getModel(provider, model)` 解析 pi-ai 内置模型。若包含 `base_url` 或 `api`，客户端构造自定义 `Model`，默认 `api = "openai-completions"`，并填入保守的 `contextWindow/maxTokens/cost/input/reasoning` 默认值。

理由：

- 常规 provider 路径最大化复用 pi-ai 封装。
- 当前 SiliconFlow 类代理仍可继续使用，但变成“自定义端点”而不是全局默认形态。
- 自定义模型字段集中在少数需要代理的档案里，不污染普通档案。

### Decision 3: 鉴权优先级

调用 options 的 `apiKey` 解析顺序：

1. 模型档案 `api_key` 非空时使用它。
2. 否则使用 pi-ai `getEnvApiKey(provider)` 查找 provider 对应环境变量。
3. 若二者都没有，`complete/stream` 返回现有占位响应，不直接调用 provider。

理由：

- 符合 pi-ai 文档推荐的 provider 环境变量方式。
- 仍支持 config 文件显式覆盖。
- 本地测试不依赖真实 key。

### Decision 4: 环境变量只覆盖 active alias

新增 `LLM_MODEL` 环境变量覆盖 `llm.default_model`。不通过环境变量覆盖任意模型档案字段。

理由：

- 多环境部署经常只需要切换 alias。
- 避免把复杂结构塞进环境变量，配置仍以 TOML 为主。

## Risks / Trade-offs

- **配置破坏式迁移** → 更新 `config.example.toml` 和本地 `config.toml`，并用 Zod 错误提示指出 `default_model/models` 缺失。
- **pi-ai 内置 model id 写错时启动后才发现** → 在 `createLlmClient()` 初始化时解析默认 alias 并抛出清晰错误。
- **自定义模型默认元数据不精确** → 自定义档案允许覆盖 `context_window/max_tokens/reasoning/input`；内置 provider 优先使用 pi-ai 准确元数据。
- **OAuth/ADC provider 没有 API key 但可用** → 本变更的无 key 占位逻辑只覆盖 API key 型 provider；OAuth provider 若需要后续支持，可增加 `auth = "oauth"` 之类配置。

## Migration Plan

1. 更新 OpenSpec spec 和 tasks。
2. 修改 `config.ts` schema，引入 `llm.default_model`、`llm.models`、`LLM_MODEL` override。
3. 修改 `llm/client.ts`，实现 alias 解析、内置/custom 模型构造和 key 解析。
4. 更新 `config.example.toml` 和本地 `config.toml` 示例。
5. 增加配置和 LLM 客户端测试。
6. 运行 `bun test`、`bunx tsc --noEmit`、`openspec validate`。

Rollback：回退本 change 即可恢复旧单模型配置；不提供运行时兼容层。

## Open Questions

- 是否需要第二期把 active model 暴露给设置面板并支持管理员运行时切换。
