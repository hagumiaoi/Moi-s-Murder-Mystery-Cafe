## 1. OpenSpec And Configuration Shape

- [x] 1.1 Create proposal, design, spec, and task artifacts for `pi-ai-model-config`.
- [x] 1.2 Update `backend/src/config.ts` schema to parse `llm.default_model` and `llm.models`.
- [x] 1.3 Add `LLM_MODEL` environment override for the active model alias.
- [x] 1.4 Reject missing or invalid default model aliases during config loading.
- [x] 1.5 Update `backend/config.example.toml` to document built-in and custom model entries.
- [x] 1.6 Update local `backend/config.toml` to the new shape so tests and local runs keep working.

## 2. LLM Model Resolution

- [x] 2.1 Add model entry types/helpers for built-in pi-ai model entries.
- [x] 2.2 Resolve built-in entries with pi-ai `getModel(provider, model)`.
- [x] 2.3 Add explicit custom OpenAI-compatible model construction for entries with `base_url` or `api`.
- [x] 2.4 Fill custom model defaults for text input, token limits, cost, and reasoning.
- [x] 2.5 Resolve API keys from model `api_key` first and pi-ai `getEnvApiKey(provider)` second.
- [x] 2.6 Preserve local fallback responses when no API key is available.

## 3. Client Integration

- [x] 3.1 Keep `LlmClient.complete`, `completeRaw`, and `stream` call signatures unchanged.
- [x] 3.2 Ensure `runInteraction` and `/api/interact/stream` continue using `createLlmClient()` without provider details.
- [x] 3.3 Surface clear startup/runtime errors for invalid provider/model aliases.

## 4. Tests

- [x] 4.1 Add config tests for multi-model parsing and `LLM_MODEL` override.
- [x] 4.2 Add LLM client tests for built-in model resolution.
- [x] 4.3 Add LLM client tests for custom endpoint model construction.
- [x] 4.4 Add LLM client tests for explicit key, env key, and missing-key fallback behavior.

## 5. Validation

- [x] 5.1 Run `bun test` in `backend`.
- [x] 5.2 Run `bunx tsc --noEmit` in `backend`.
- [x] 5.3 Run `openspec validate pi-ai-model-config --strict`.
