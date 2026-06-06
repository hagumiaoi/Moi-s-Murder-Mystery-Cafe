import {
  complete as piComplete,
  getEnvApiKey,
  getModel,
  stream as piStream,
  type Api,
  type Context,
  type Model,
  type ProviderStreamOptions,
} from "@earendil-works/pi-ai";
import { parseLlmOutput } from "./parser.ts";
import { config, type LlmConfig, type LlmModelConfig } from "../config.ts";

export interface LlmCompletionInput {
  messages: Array<{ role: string; content: string }>;
}

export interface LlmCompletionResult {
  thinking: string;
  reply: string;
  story: string;
}

export interface LlmClient {
  complete(input: LlmCompletionInput): Promise<LlmCompletionResult>;
  completeRaw(input: LlmCompletionInput): Promise<string>;
  stream(input: LlmCompletionInput): AsyncGenerator<string>;
}

export interface ResolvedLlmModel {
  alias: string;
  entry: LlmModelConfig;
  model: Model<Api>;
  options: ProviderStreamOptions;
  hasApiKey: boolean;
}

function toContext(input: LlmCompletionInput): Context {
  return {
    messages: input.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  } as unknown as Context;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isCustomModel(entry: LlmModelConfig): boolean {
  return Boolean(entry.base_url || entry.api);
}

function resolveBuiltInModel(alias: string, entry: LlmModelConfig): Model<Api> {
  const model = getModel(entry.provider as never, entry.model as never) as Model<Api> | undefined;
  if (!model) {
    throw new Error(`Invalid LLM model "${alias}": pi-ai provider/model not found: ${entry.provider}/${entry.model}`);
  }
  return model;
}

function resolveCustomModel(alias: string, entry: LlmModelConfig): Model<Api> {
  if (!entry.base_url) {
    throw new Error(`Invalid LLM model "${alias}": custom model entries require base_url`);
  }

  return {
    id: entry.model,
    name: entry.model,
    api: (entry.api ?? "openai-completions") as Api,
    provider: entry.provider,
    baseUrl: entry.base_url,
    reasoning: entry.reasoning ?? false,
    input: entry.input ?? ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: entry.context_window ?? 128000,
    maxTokens: entry.max_tokens ?? 32000,
    headers: entry.headers,
  };
}

export function resolveConfiguredLlmModel(llmConfig: LlmConfig = config.llm): ResolvedLlmModel {
  const alias = llmConfig.default_model;
  const entry = llmConfig.models[alias];
  if (!entry) {
    throw new Error(`Invalid LLM default_model "${alias}": alias is not defined in llm.models`);
  }

  const model = isCustomModel(entry)
    ? resolveCustomModel(alias, entry)
    : resolveBuiltInModel(alias, entry);

  const apiKey = nonEmpty(entry.api_key) ?? getEnvApiKey(entry.provider);
  const options: ProviderStreamOptions = {};
  if (apiKey) options.apiKey = apiKey;
  if (entry.temperature !== undefined) options.temperature = entry.temperature;
  if (entry.max_tokens !== undefined) options.maxTokens = entry.max_tokens;

  return {
    alias,
    entry,
    model,
    options,
    hasApiKey: Boolean(apiKey),
  };
}

class PiAIClient implements LlmClient {
  constructor(private readonly resolved: ResolvedLlmModel) {}

  async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    if (!this.resolved.hasApiKey) {
      return { thinking: "（配置错误）未检测到 API key", reply: "（无正文）", story: "" };
    }
    try {
      const response = await piComplete(this.resolved.model, toContext(input), this.resolved.options);
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      return parseLlmOutput(text);
    } catch (e) {
      return { thinking: "", reply: `（大模型断线: ${String(e)}）`, story: "寒风呼啸，大雪封山。" };
    }
  }

  async completeRaw(input: LlmCompletionInput): Promise<string> {
    if (!this.resolved.hasApiKey) {
      throw new Error("（配置错误）未检测到 API key");
    }
    try {
      const response = await piComplete(this.resolved.model, toContext(input), this.resolved.options);
      return response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (e) {
      throw new Error(`（大模型断线: ${String(e)}）`);
    }
  }

  async *stream(input: LlmCompletionInput): AsyncGenerator<string> {
    if (!this.resolved.hasApiKey) {
      yield "（配置错误）未检测到 API key";
      return;
    }
    try {
      const s = piStream(this.resolved.model, toContext(input), this.resolved.options);
      for await (const event of s) {
        if (event.type === "text_delta") {
          yield event.delta;
        } else if (event.type === "error") {
          yield `（大模型断线: ${event.error.errorMessage ?? event.reason}）`;
          yield "寒风呼啸，大雪封山。";
          return;
        }
      }
    } catch (e) {
      yield `（大模型断线: ${String(e)}）`;
      yield "寒风呼啸，大雪封山。";
    }
  }
}

export function createLlmClient(llmConfig: LlmConfig = config.llm): LlmClient {
  return new PiAIClient(resolveConfiguredLlmModel(llmConfig));
}
