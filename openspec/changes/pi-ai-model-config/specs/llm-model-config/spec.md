## ADDED Requirements

### Requirement: Multi Model LLM Configuration
The backend SHALL configure LLM access through `llm.default_model` and named `llm.models` entries.

#### Scenario: Default alias selects configured model
- **WHEN** `config.toml` defines `llm.default_model = "primary"` and `[llm.models.primary]`
- **THEN** the backend uses the `primary` model entry for LLM calls

#### Scenario: Missing default alias is rejected
- **WHEN** `llm.default_model` references an alias that is not present in `llm.models`
- **THEN** backend configuration validation fails with a clear error

#### Scenario: Environment overrides default alias
- **WHEN** `LLM_MODEL` is set to the name of a configured model entry
- **THEN** the backend uses that alias instead of `llm.default_model`

### Requirement: Built In Pi AI Providers
The backend SHALL use pi-ai built-in provider/model metadata for model entries that only specify `provider` and `model`.

#### Scenario: Built in model entry
- **WHEN** a model entry defines `provider = "deepseek"` and `model = "deepseek-chat"` without `base_url` or `api`
- **THEN** the LLM client resolves the model through pi-ai `getModel(provider, model)`
- **AND** it does not construct a manual `Model<"openai-completions">`

#### Scenario: Invalid built in provider or model
- **WHEN** a model entry references a provider/model pair not known to pi-ai
- **THEN** the LLM client fails during initialization with an actionable configuration error

### Requirement: Custom OpenAI Compatible Model Entries
The backend SHALL support explicit custom model entries for OpenAI-compatible endpoints.

#### Scenario: Custom endpoint entry
- **WHEN** a model entry includes `base_url`
- **THEN** the LLM client constructs a custom pi-ai `Model` for that endpoint
- **AND** defaults the API to `openai-completions` unless `api` is explicitly configured

#### Scenario: Custom endpoint metadata defaults
- **WHEN** a custom model entry omits optional metadata such as `context_window`, `max_tokens`, `reasoning`, or `input`
- **THEN** the LLM client fills conservative defaults sufficient for text chat

### Requirement: Provider API Key Resolution
The backend SHALL resolve provider credentials from model entry overrides or pi-ai provider environment variables.

#### Scenario: Explicit API key wins
- **WHEN** a model entry has a non-empty `api_key`
- **THEN** the LLM client passes that key to pi-ai calls

#### Scenario: Environment API key fallback
- **WHEN** a model entry does not have `api_key`
- **THEN** the LLM client uses pi-ai environment key discovery for that provider

#### Scenario: Missing API key keeps local fallback behavior
- **WHEN** no explicit API key and no provider environment API key are available
- **THEN** `complete`, `completeRaw`, and `stream` keep the existing local fallback behavior rather than making a provider request

### Requirement: Stable LLM Client Contract
The backend LLM client SHALL keep the existing application-facing methods while hiding model selection details.

#### Scenario: Existing call sites unchanged
- **WHEN** `runInteraction` or streaming routes call `llm.complete`, `llm.completeRaw`, or `llm.stream`
- **THEN** they do not need to pass provider, base URL, or model id

#### Scenario: Config example documents multiple models
- **WHEN** developers open `backend/config.example.toml`
- **THEN** it shows at least one pi-ai built-in provider model and one custom OpenAI-compatible endpoint model
- **AND** it documents switching models via `default_model`
