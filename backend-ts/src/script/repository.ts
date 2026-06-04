import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { manifestSchema, type Manifest } from "./schemas.ts";
import { config } from "../config.ts";

const scriptDir = join(new URL("../..", import.meta.url).pathname, config.game.script_dir);

function loadManifest(): Manifest {
  const path = join(scriptDir, "manifest.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    console.error(`Failed to read manifest: ${path}`);
    process.exit(1);
  }

  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid manifest.json:");
    for (const issue of result.error.issues) {
      console.error(`  [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

function loadNpcScript(scriptFile: string): string {
  const path = join(scriptDir, scriptFile);
  if (existsSync(path)) {
    const content = readFileSync(path, "utf-8").trim();
    if (content) return content;
  }
  return "此人没有任何外接经历记录。";
}

function validateMurdererConfig(npcs: Manifest["npcs"]): void {
  const murderers = npcs.filter((n) => n.is_murderer);
  if (murderers.length === 0) {
    console.error("No murderer configured in manifest (no NPC with is_murderer: true)");
    process.exit(1);
  }
  if (murderers.length > 1) {
    console.warn(`Multiple murderers configured: ${murderers.map((n) => n.name).join(", ")}`);
  }
}

function validateFirstNpc(npcs: Manifest["npcs"], firstNpc?: string): void {
  if (!firstNpc) return;
  const names = npcs.map((n) => n.name);
  if (!names.includes(firstNpc)) {
    console.error(`first_npc "${firstNpc}" not found in npcs: ${names.join(", ")}`);
    process.exit(1);
  }
}

const manifest = loadManifest();
validateMurdererConfig(manifest.npcs);
validateFirstNpc(manifest.npcs, manifest.first_npc);

export const repository = {
  manifest,
  npcNames: manifest.npcs.map((n) => n.name),
  npcScriptMap: Object.fromEntries(manifest.npcs.map((n) => [n.name, n.script_file])),
  npcSecrets: Object.fromEntries(manifest.npcs.map((n) => [n.name, n.core_secret])),
  murdererName: manifest.npcs.find((n) => n.is_murderer)!.name,
  firstNpc: manifest.first_npc ?? manifest.npcs[0].name,
  loadNpcScript,
} as const;
