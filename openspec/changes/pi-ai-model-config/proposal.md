## Why

当前后端 LLM 客户端手写 `Model<"openai-completions">`，并在 `[llm]` 下暴露 `provider/api_key/base_url/model`。这没有利用 `@earendil-works/pi-ai` 已封装的 provider/model 注册表，也让常见供应商配置比必要的更复杂。

本变更把 LLM 配置改为“模型档案”形式：常规场景只配置 pi-ai provider 和 model id，通过 provider 环境变量或可选 key 覆盖完成鉴权；同时允许声明多个模型并自由切换默认模型。

## What Changes

- **BREAKING**: `[llm]` 配置从单一 `provider/api_key/base_url/model` 改为 `default_model` + `[llm.models.<alias>]` 多模型配置。
- 支持每个模型档案配置 `provider`、`model`、`temperature`、`api_key` 等调用参数。
- 常规模型通过 `getModel(provider, model)` 使用 pi-ai 内置供应商和模型元数据，不再手写 `api/baseUrl/contextWindow/maxTokens/cost`。
- 保留自定义 OpenAI-compatible 端点能力：仅当模型档案显式提供 `api`、`base_url` 等字段时构造自定义 `Model`。
- LLM 客户端支持按 alias 创建/切换模型，默认使用 `llm.default_model`。
- 更新 `config.example.toml`，展示 DeepSeek/SiliconFlow 类内置 provider 配置和多模型切换示例。
- 增加配置解析和模型选择测试，确保无 API key 时仍保留现有离线占位行为。

## Capabilities

### New Capabilities

- `llm-model-config`: 后端可通过 pi-ai 内置 provider/model 或显式自定义模型档案配置多个 LLM，并选择默认模型。

### Modified Capabilities

- 无。

## Impact

- Backend config: `backend/src/config.ts`、`backend/config.example.toml`、本地 `backend/config.toml` 示例结构。
- Backend LLM: `backend/src/llm/client.ts` 的模型解析、调用 options 和缺 key 处理。
- Tests: 新增/更新配置解析和 LLM 模型解析测试。
- Runtime: 部署环境需要把旧 `[llm] provider/api_key/base_url/model` 迁移到新的 `[llm.models.<alias>]` 结构。
