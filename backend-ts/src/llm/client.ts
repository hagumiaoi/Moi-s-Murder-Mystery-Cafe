import { complete, stream, type Model, type Context } from "@earendil-works/pi-ai";
import { parseLlmOutput } from "./parser.ts";
import { config } from "../config.ts";

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

const model: Model<"openai-completions"> = {
  id: config.llm.model,
  name: config.llm.model,
  api: "openai-completions",
  provider: config.llm.provider,
  baseUrl: config.llm.base_url,
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000,
};

const options: Record<string, unknown> = {
  apiKey: config.llm.api_key,
  temperature: config.llm.temperature,
};

function toContext(input: LlmCompletionInput): Context {
  return {
    messages: input.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  } as unknown as Context;
}

class PiAIClient implements LlmClient {
  async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    if (!config.llm.api_key) {
      return { thinking: "（配置错误）未检测到 API key", reply: "（无正文）", story: "" };
    }
    try {
      const response = await complete(model, toContext(input), options);
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
    if (!config.llm.api_key) {
      throw new Error("（配置错误）未检测到 API key");
    }
    try {
      const response = await complete(model, toContext(input), options);
      return response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (e) {
      throw new Error(`（大模型断线: ${String(e)}）`);
    }
  }

  async *stream(input: LlmCompletionInput): AsyncGenerator<string> {
    if (!config.llm.api_key) {
      yield "（配置错误）未检测到 API key";
      return;
    }
    try {
      const s = stream(model, toContext(input), options);
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

export function createLlmClient(): LlmClient {
  return new PiAIClient();
}
