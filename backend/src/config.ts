import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const configDir = new URL(".", import.meta.url).pathname;
const configPath = join(configDir, "..", "config.toml");

const serverSchema = z.object({
  port: z.number().int().positive(),
  host: z.string(),
});

const llmModelSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  api_key: z.string().optional(),
  api: z.string().min(1).optional(),
  base_url: z.string().min(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  context_window: z.number().int().positive().optional(),
  reasoning: z.boolean().optional(),
  input: z.array(z.enum(["text", "image"])).optional(),
  headers: z.record(z.string()).optional(),
});

const llmSchema = z.object({
  default_model: z.string().min(1),
  models: z.record(llmModelSchema).refine((models) => Object.keys(models).length > 0, {
    message: "llm.models must contain at least one model entry",
  }),
}).superRefine((llm, ctx) => {
  if (!llm.models[llm.default_model]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["default_model"],
      message: `default_model "${llm.default_model}" is not defined in llm.models`,
    });
  }
});

const gameSchema = z.object({
  script_dir: z.string(),
});

const configSchema = z.object({
  server: serverSchema,
  llm: llmSchema,
  game: gameSchema,
  debug: z.object({ enabled: z.boolean() }).optional().default({ enabled: false }),
});

export type Config = z.infer<typeof configSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
export type LlmConfig = z.infer<typeof llmSchema>;
export type LlmModelConfig = z.infer<typeof llmModelSchema>;
export type GameConfig = z.infer<typeof gameSchema>;

export function parseConfig(raw: unknown, env: Record<string, string | undefined> = process.env): Config {
  const config = configSchema.parse(raw);
  const portOverride = env.PORT;
  if (portOverride) {
    const port = Number(portOverride);
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error(`Invalid PORT override: ${portOverride}`);
    }
    config.server.port = port;
  }

  const modelOverride = env.LLM_MODEL?.trim();
  if (modelOverride) {
    if (!config.llm.models[modelOverride]) {
      throw new Error(`Invalid LLM_MODEL override: "${modelOverride}" is not defined in llm.models`);
    }
    config.llm.default_model = modelOverride;
  }

  return config;
}

function loadConfig(): Config {
  let text: string;
  try {
    text = readFileSync(configPath, "utf-8");
  } catch {
    console.error("config.toml not found. Run: cp config.example.toml config.toml");
    process.exit(1);
  }

  const raw = Bun.TOML.parse(text);

  try {
    return parseConfig(raw);
  } catch (err) {
    console.error("Invalid config.toml:");
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        console.error(`  [${issue.path.join(".")}] ${issue.message}`);
      }
    } else {
      console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }
}

export const config = loadConfig();
