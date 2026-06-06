import { describe, expect, it } from "bun:test";
import { createLlmClient, resolveConfiguredLlmModel } from "../src/llm/client";
import type { LlmConfig } from "../src/config";

function llmConfig(entry: LlmConfig["models"][string]): LlmConfig {
  return {
    default_model: "primary",
    models: {
      primary: entry,
    },
  };
}

describe("LLM client model resolution", () => {
  it("resolves built-in pi-ai provider models", () => {
    const resolved = resolveConfiguredLlmModel(llmConfig({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      api_key: "explicit-key",
      temperature: 0.1,
    }));

    expect(resolved.alias).toBe("primary");
    expect(resolved.model.provider).toBe("deepseek");
    expect(resolved.model.id).toBe("deepseek-v4-flash");
    expect(resolved.options.apiKey).toBe("explicit-key");
    expect(resolved.options.temperature).toBe(0.1);
    expect(resolved.hasApiKey).toBe(true);
  });

  it("rejects invalid built-in provider models", () => {
    expect(() => resolveConfiguredLlmModel(llmConfig({
      provider: "deepseek",
      model: "missing-model",
    }))).toThrow(/pi-ai provider\/model not found/);
  });

  it("constructs custom OpenAI-compatible endpoint models", () => {
    const resolved = resolveConfiguredLlmModel(llmConfig({
      provider: "siliconflow",
      model: "deepseek-ai/DeepSeek-V3",
      base_url: "https://api.siliconflow.cn/v1",
      api_key: "sf-key",
      context_window: 64000,
      max_tokens: 8192,
      reasoning: true,
    }));

    expect(resolved.model.provider).toBe("siliconflow");
    expect(resolved.model.api).toBe("openai-completions");
    expect(resolved.model.baseUrl).toBe("https://api.siliconflow.cn/v1");
    expect(resolved.model.contextWindow).toBe(64000);
    expect(resolved.model.maxTokens).toBe(8192);
    expect(resolved.model.reasoning).toBe(true);
    expect(resolved.options.apiKey).toBe("sf-key");
  });

  it("uses pi-ai provider environment keys when api_key is absent", () => {
    const previous = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "env-key";
    try {
      const resolved = resolveConfiguredLlmModel(llmConfig({
        provider: "deepseek",
        model: "deepseek-v4-flash",
      }));
      expect(resolved.options.apiKey).toBe("env-key");
      expect(resolved.hasApiKey).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previous;
      }
    }
  });

  it("preserves local fallback behavior when no API key is available", async () => {
    const client = createLlmClient(llmConfig({
      provider: "siliconflow",
      model: "deepseek-ai/DeepSeek-V3",
      base_url: "https://api.siliconflow.cn/v1",
      api_key: "",
    }));

    const result = await client.complete({ messages: [{ role: "user", content: "test" }] });
    expect(result.thinking).toContain("未检测到 API key");

    await expect(client.completeRaw({ messages: [{ role: "user", content: "test" }] })).rejects.toThrow(/未检测到 API key/);

    const tokens: string[] = [];
    for await (const token of client.stream({ messages: [{ role: "user", content: "test" }] })) {
      tokens.push(token);
    }
    expect(tokens).toEqual(["（配置错误）未检测到 API key"]);
  });
});
