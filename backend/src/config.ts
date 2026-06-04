import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const configDir = new URL(".", import.meta.url).pathname;
const configPath = join(configDir, "..", "config.toml");

const serverSchema = z.object({
  port: z.number().int().positive(),
  host: z.string(),
});

const llmSchema = z.object({
  provider: z.string(),
  api_key: z.string(),
  base_url: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2),
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
export type GameConfig = z.infer<typeof gameSchema>;

function loadConfig(): Config {
  let text: string;
  try {
    text = readFileSync(configPath, "utf-8");
  } catch {
    console.error("config.toml not found. Run: cp config.example.toml config.toml");
    process.exit(1);
  }

  const raw = Bun.TOML.parse(text);

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid config.toml:");
    for (const issue of result.error.issues) {
      console.error(`  [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }

  const config = result.data;
  const portOverride = process.env.PORT;
  if (portOverride) {
    const port = Number(portOverride);
    if (!Number.isInteger(port) || port <= 0) {
      console.error(`Invalid PORT override: ${portOverride}`);
      process.exit(1);
    }
    config.server.port = port;
  }

  return config;
}

export const config = loadConfig();
