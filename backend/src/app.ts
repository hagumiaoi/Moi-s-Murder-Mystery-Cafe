import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { z } from "zod";
import { repository } from "./script/repository.ts";
import { MemoryGameStore } from "./game/store.ts";
import type { GameStore } from "./game/store.ts";
import { createLlmClient } from "./llm/client.ts";
import { parseLlmOutput } from "./llm/parser.ts";
import { runInteraction } from "./llm/interactions.ts";
import { flattenStories } from "./llm/prompts.ts";
import { config } from "./config.ts";
import type { StoryEntry, SSEEvent, InteractionInput } from "@shared/types";

const app = new Hono();

const interactionInputSchema = z.object({
  interaction_id: z.string().min(1),
  target_entity: z.string().optional(),
  evidence_ids: z.array(z.string()).optional(),
  text: z.string().optional(),
  answers: z.array(z.object({
    question_id: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
  })).optional(),
});

const selectEntitySchema = z.object({ entity_id: z.string().min(1) });
const undoResendSchema = z.object({
  entity_id: z.string().min(1),
  message_index: z.number().int().nonnegative(),
  new_message: z.string().min(1),
});

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

const store: GameStore = new MemoryGameStore();
const llm = createLlmClient();

function makeStory(storyText: string): StoryEntry {
  return { story: storyText };
}

function makeStoryWithThinking(storyText: string, thinking?: string): StoryEntry {
  const entry: StoryEntry = { story: storyText };
  if (thinking) entry.thinking = thinking;
  return entry;
}

function isDebugEnabled(): boolean {
  return config.debug.enabled === true;
}

function requireDebug(c: Context) {
  if (!isDebugEnabled()) return c.json({ error: "Debug mode is not enabled" }, 403);
  return null;
}

async function parseBody<T>(c: Context, schema: z.ZodType<T>) {
  try {
    const raw = await c.req.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      return { error: c.json({ error: "请求参数无效", details: result.error.issues }, 400) };
    }
    return { data: result.data };
  } catch {
    return { error: c.json({ error: "请求体不是有效 JSON" }, 400) };
  }
}

function checkInteractionValid(input: InteractionInput): string | null {
  const interaction = repository.manifest.interactions.find((i) => i.id === input.interaction_id);
  if (!interaction) return `未知的交互类型: ${input.interaction_id}`;

  if (interaction.target) {
    const targetId = input.target_entity;
    if (!targetId) return `交互 ${input.interaction_id} 需要指定目标实体`;

    const targetEntity = repository.getEntityById(targetId);
    if (!targetEntity) return `目标实体不存在: ${targetId}`;

    if (interaction.target.kind && !interaction.target.kind.includes(targetEntity.kind)) {
      return `${targetEntity.name} 不支持此交互`;
    }
    if (interaction.target.tags && !targetEntity.tags?.some((t) => interaction.target!.tags!.includes(t))) {
      return `${targetEntity.name} 不支持此交互`;
    }
    if (interaction.target.ids && !interaction.target.ids.includes(targetId)) {
      return `${targetEntity.name} 不支持此交互`;
    }
  }

  if (interaction.requires) {
    const state = store.getState();
    if (interaction.requires.evidence) {
      for (const eid of interaction.requires.evidence) {
        if (!state.discovered_evidence.includes(eid)) {
          return `需要先发现证据: ${eid}`;
        }
      }
    }
    if (interaction.requires.facts) {
      for (const fid of interaction.requires.facts) {
        if (!state.revealed_facts.includes(fid)) {
          return `需要先揭示事实: ${fid}`;
        }
      }
    }
  }

  return null;
}

// ── GET /api/info (redacted public manifest) ──

app.get("/api/info", (c) => {
  const state = store.getState();
  return c.json(repository.buildPublicManifest(state.revealed_facts, state.discovered_evidence));
});

// ── GET /api/state ──

app.get("/api/state", (c) => {
  return c.json(store.getState());
});

// ── POST /api/new-game ──

app.post("/api/new-game", (c) => {
  store.reset();
  return c.json(store.getState());
});

// ── POST /api/select-entity ──

app.post("/api/select-entity", async (c) => {
  const parsed = await parseBody<{ entity_id: string }>(c, selectEntitySchema);
  if (parsed.error) return parsed.error;
  store.switchEntity(parsed.data.entity_id);
  return c.json(store.getState());
});

// ── POST /api/interact (unified) ──

app.post("/api/interact", async (c) => {
  const parsed = await parseBody<InteractionInput>(c, interactionInputSchema);
  if (parsed.error) return parsed.error;

  const input = parsed.data;
  const state = store.getState();
  if (state.game_over) {
    return c.json({ error: "游戏已结束", state: store.getState() });
  }

  const validationError = checkInteractionValid(input);
  if (validationError) {
    return c.json({ error: validationError, state: store.getState() });
  }

  const snap = store.createSnapshot();

  if (input.interaction_id !== "submit-resolution") {
    if (input.interaction_id === "search") {
      const targetId = input.target_entity || state.current_entity;
      const clue = store.getUndiscoveredClue(targetId);
      if (!clue) {
        const locName = repository.getEntityById(targetId)?.name ?? targetId;
        return c.json({ error: "该房间暂时没有更多可发现的线索", state: store.getState() });
      }
    }
    const cost = repository.manifest.interactions.find((i) => i.id === input.interaction_id)?.cost?.progress ?? 1;
    for (let i = 0; i < cost; i++) {
      if (store.advanceRound()) {
        return c.json({ game_over: true, state: store.getState() });
      }
    }
  }

  const result = await runInteraction(input, store, snap);

  if (result.error) {
    return c.json({ error: result.error, state: store.getState() });
  }

  return c.json({
    reply: result.reply,
    story: result.story,
    thinking: result.thinking,
    prompt: result.prompt,
    state: store.getState(),
    game_over: result.game_over,
    win: result.win,
    message: result.message,
    ending: result.ending,
  });
});

// ── POST /api/interact/stream (SSE talk streaming) ──

app.post("/api/interact/stream", async (c) => {
  const parsed = await parseBody<InteractionInput>(c, interactionInputSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;

  const state = store.getState();
  if (state.game_over) {
    return c.json({ error: "游戏已结束" });
  }

  if (input.interaction_id !== "talk" && input.interaction_id !== "confront") {
    const validationError = checkInteractionValid(input);
    if (validationError) {
      return c.json({ error: validationError, state: store.getState() });
    }
    if (input.interaction_id === "search") {
      const targetId = input.target_entity || state.current_entity;
      if (!store.getUndiscoveredClue(targetId)) {
        const locName = repository.getEntityById(targetId)?.name ?? targetId;
        return c.json({ error: "该房间暂时没有更多可发现的线索", state: store.getState() });
      }
    }
    if (input.interaction_id !== "submit-resolution") {
      const cost = repository.manifest.interactions.find((i) => i.id === input.interaction_id)?.cost?.progress ?? 1;
      for (let i = 0; i < cost; i++) {
        if (store.advanceRound()) {
          return c.json({ game_over: true, state: store.getState() });
        }
      }
    }
    const result = await runInteraction(input, store);
    return c.json(result);
  }

  const validationError = checkInteractionValid(input);
  if (validationError) {
    return c.json({ error: validationError, state: store.getState() });
  }

  const targetId = input.target_entity || state.current_entity;
  const targetEntity = repository.getEntityById(targetId);
  if (!targetEntity || targetEntity.kind !== "person") {
    return c.json({ error: "交谈对象必须是人物" });
  }

  const snap = store.createSnapshot();
  const cost = repository.manifest.interactions.find((i) => i.id === input.interaction_id)?.cost?.progress ?? 1;
  for (let i = 0; i < cost; i++) {
    if (store.advanceRound()) {
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({ data: JSON.stringify({ type: "game_over", state: store.getState() }) });
      });
    }
  }

  store.addChatMessage(targetEntity.id, { role: "player", content: input.text ?? "", _snap: snap });

  const secret = repository.getEntitySecret(targetId);
  const script = repository.getEntityScript(targetId);
  const storyCtx = flattenStories(state.stories);
  const chatPrompt = repository.manifest.prompts.npc_chat
    .replace(/\{entity_name\}/g, targetEntity.name)
    .replace(/\{npc_name\}/g, targetEntity.name)
    .replace(/\{entity_secret\}/g, secret)
    .replace(/\{core_secret\}/g, secret)
    .replace(/\{entity_script\}/g, script)
    .replace(/\{npc_script\}/g, script)
    .replace(/\{story_context\}/g, storyCtx)
    .replace(/\{player_input\}/g, input.text ?? "")
    .replace(/\{title\}/g, repository.manifest.title)
    .replace(/\{day\}/g, String(state.phase + 1));

  return streamSSE(c, async (stream) => {
    let fullText = "";
    try {
      for await (const token of llm.stream({ messages: [{ role: "user", content: chatPrompt }] })) {
        fullText += token;
        await stream.writeSSE({ data: JSON.stringify({ type: "token", content: token }) });
      }
    } catch {
      await stream.writeSSE({ data: JSON.stringify({ type: "token", content: "（大模型断线）" }) });
      await stream.writeSSE({ data: JSON.stringify({ type: "token", content: "寒风呼啸，大雪封山。" }) });
    }

    const { thinking, reply, story: storyText } = parseLlmOutput(fullText);
    store.addChatMessage(targetEntity.id, { role: "npc", content: reply });
    store.addStory(makeStoryWithThinking(storyText, thinking));

    await stream.writeSSE({ data: JSON.stringify({ type: "done", prompt: chatPrompt, state: store.getState() }) });
  });
});

// ── POST /api/undo-and-resend ──

app.post("/api/undo-and-resend", async (c) => {
  const parsed = await parseBody<{ entity_id: string; message_index: number; new_message: string }>(c, undoResendSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const state = store.getState();
  if (state.game_over) {
    return c.json({ error: "游戏已结束" });
  }

  const history = state.chat_history[body.entity_id];
  if (!history || body.message_index < 0 || body.message_index >= history.length) {
    return c.json({ error: "消息索引无效" });
  }

  const msg = history[body.message_index];
  if (msg.role !== "player") {
    return c.json({ error: "只能撤回自己的消息" });
  }
  if (!msg._snap) {
    return c.json({ error: "该消息无法撤回（缺少快照）" });
  }

  store.restoreSnapshot(msg._snap);
  store.truncateChatHistory(body.entity_id, body.message_index);
  const snap = store.createSnapshot();

  const input: InteractionInput = {
    interaction_id: "talk",
    target_entity: body.entity_id,
    text: body.new_message,
  };
  const result = await runInteraction(input, store, snap);

  return c.json({
    reply: result.reply,
    story: result.story,
    thinking: result.thinking,
    prompt: result.prompt,
    state: store.getState(),
  });
});

// ── Debug-only API ──

app.get("/api/debug/manifest", (c) => {
  const blocked = requireDebug(c);
  if (blocked) return blocked;
  return c.json(repository.manifest);
});

app.get("/api/debug/state", (c) => {
  const blocked = requireDebug(c);
  if (blocked) return blocked;
  return c.json({
    state: store.getState(),
    manifest: repository.manifest,
  });
});

app.post("/api/debug/prompt", async (c) => {
  const blocked = requireDebug(c);
  if (blocked) return blocked;

  const parsed = await parseBody<InteractionInput>(c, interactionInputSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;
  const state = store.getState();
  const targetId = input.target_entity || state.current_entity;
  const targetEntity = repository.getEntityById(targetId);

  if (!targetEntity) {
    return c.json({ error: "目标实体不存在" });
  }

  const secret = repository.getEntitySecret(targetId);
  const script = repository.getEntityScript(targetId);
  const storyCtx = flattenStories(state.stories);

  const prompt = repository.manifest.prompts.npc_chat
    .replace(/\{entity_name\}/g, targetEntity.name)
    .replace(/\{npc_name\}/g, targetEntity.name)
    .replace(/\{entity_secret\}/g, secret)
    .replace(/\{core_secret\}/g, secret)
    .replace(/\{entity_script\}/g, script)
    .replace(/\{npc_script\}/g, script)
    .replace(/\{story_context\}/g, storyCtx)
    .replace(/\{player_input\}/g, input.text ?? "")
    .replace(/\{title\}/g, repository.manifest.title)
    .replace(/\{day\}/g, String(state.phase + 1));

  return c.json({ prompt });
});

export default app;
