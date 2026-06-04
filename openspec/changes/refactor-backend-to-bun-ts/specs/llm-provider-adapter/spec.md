## ADDED Requirements

### Requirement: LLM 调用通过 Provider Adapter
后端 SHALL 通过内部适配器接口调用语言模型，而不是在路由或游戏规则模块中直接调用 Provider SDK。

#### Scenario: 游戏引擎请求模型补全
- **WHEN** 游戏引擎需要生成 NPC 对话或搜索叙事
- **THEN** 游戏引擎 SHALL 使用完整 Prompt 调用 LLM Adapter，并接收生成文本，而不依赖 Provider 专属 SDK 对象

### Requirement: 支持 OpenAI-compatible 配置
LLM Adapter SHALL 通过可配置的 API key、base URL、model 和 temperature 支持 OpenAI-compatible chat completion Provider。

#### Scenario: 配置了现有环境变量
- **WHEN** 存在 `SF_API_KEY`、`SF_BASE_URL`、`SF_MODEL` 和 `TEMPERATURE`
- **THEN** Bun 后端 SHALL 能够以等价于当前后端的行为调用配置的 OpenAI-compatible Provider

#### Scenario: 缺少 API key
- **WHEN** 没有配置任何受支持的 LLM API key 环境变量
- **THEN** 后端 SHALL 返回或流式输出清晰的配置错误，并保持与当前玩法 fallback 行为一致

### Requirement: 标准化流式 Provider 输出
LLM Adapter SHALL 将 Provider 的流式响应标准化为聊天流式路由可消费的异步 token 流。

#### Scenario: Provider 输出流式 delta
- **WHEN** 配置的 Provider 返回增量 chat completion delta
- **THEN** Adapter SHALL yield 纯文本 token，由路由编码成现有 SSE `token` 事件

### Requirement: LLM 输出解析独立且可测试
后端 SHALL 通过专门 parser 模块将模型生成文本解析为 `thinking`、`reply` 和 `story`。

#### Scenario: 模型返回预期标记
- **WHEN** 生成文本包含 `思考过程：`、`NPC回复：` 和 `正文：`
- **THEN** Parser SHALL 提取对应的 `thinking`、`reply` 和 `story` 字段

#### Scenario: 模型返回格式异常文本
- **WHEN** 生成文本缺少一个或多个预期标记
- **THEN** Parser SHALL 返回可用的 reply 和与当前行为一致的 fallback story
