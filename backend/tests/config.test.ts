import { describe, expect, it } from "bun:test";
import { parseConfig } from "../src/config";

const baseConfig = {
  server: {
    port: 8000,
    host: "0.0.0.0",
  },
  llm: {
    default_model: "primary",
    models: {
      primary: {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        temperature: 0,
      },
      backup: {
        provider: "openai",
        model: "gpt-4o-mini",
      },
    },
  },
  game: {
    script_dir: "../Script",
  },
};

describe("parseConfig", () => {
  it("parses multi-model LLM config", () => {
    const config = parseConfig(baseConfig, {});
    expect(config.llm.default_model).toBe("primary");
    expect(config.llm.models.primary.provider).toBe("deepseek");
    expect(config.llm.models.backup.model).toBe("gpt-4o-mini");
  });

  it("allows LLM_MODEL to override the default alias", () => {
    const config = parseConfig(baseConfig, { LLM_MODEL: "backup" });
    expect(config.llm.default_model).toBe("backup");
  });

  it("rejects missing default aliases", () => {
    expect(() => parseConfig({
      ...baseConfig,
      llm: {
        ...baseConfig.llm,
        default_model: "missing",
      },
    }, {})).toThrow(/not defined in llm\.models/);
  });

  it("rejects invalid LLM_MODEL overrides", () => {
    expect(() => parseConfig(baseConfig, { LLM_MODEL: "missing" })).toThrow(/Invalid LLM_MODEL override/);
  });

  it("keeps PORT override behavior", () => {
    const config = parseConfig(baseConfig, { PORT: "9000" });
    expect(config.server.port).toBe(9000);
  });
});
