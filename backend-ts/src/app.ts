import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { z } from "zod";
import { repository } from "./script/repository.ts";
import { MemoryGameStore } from "./game/store.ts";
import type { GameStore } from "./game/store.ts";
import { createLlmClient } from "./llm/client.ts";
import { buildNpcChatPrompt, buildSearchStoryPrompt, flattenStories } from "./llm/prompts.ts";
import { parseLlmOutput } from "./llm/parser.ts";
import type {
  ChatRequest,
  ChatMessage,
  SelectNPCRequest,
  AccuseRequest,
  SearchRequest,
  UndoResendRequest,
  StoryEntry,
  SSEEvent,
  SnapShot,
} from "@shared/types";

const app = new Hono();

const chatRequestSchema = z.object({ message: z.string().min(1) });
const selectNpcRequestSchema = z.object({ npc_name: z.string().min(1) });
const accuseRequestSchema = z.object({ target: z.string().min(1) });
const searchRequestSchema = z.object({ location_id: z.string().min(1) });
const undoResendRequestSchema = z.object({
  npc_name: z.string().min(1),
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

function getLlm() {
  return createLlmClient();
}

function makeStory(storyText: string): StoryEntry {
  return { story: storyText };
}

function makeStoryWithThinking(storyText: string, thinking?: string): StoryEntry {
  const entry: StoryEntry = { story: storyText };
  if (thinking) entry.thinking = thinking;
  return entry;
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

// ── GET /api/info ──

app.get("/api/info", (c) => {
  const m = repository.manifest;
  return c.json({
    title: m.title,
    description: m.description,
    max_days: m.max_days,
    rounds_per_day: m.rounds_per_day,
    npcs: m.npcs.map((n) => ({ name: n.name, id: n.id })),
    timeline: m.timeline,
    search_locations: m.search_locations.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
    })),
  });
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

// ── POST /api/select-npc ──

app.post("/api/select-npc", async (c) => {
  const parsed = await parseBody<SelectNPCRequest>(c, selectNpcRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  store.switchNpc(body.npc_name);
  return c.json(store.getState());
});

// ── POST /api/accuse ──

app.post("/api/accuse", async (c) => {
  const parsed = await parseBody<AccuseRequest>(c, accuseRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const state = store.getState();
  state.game_over = true;

  if (body.target === repository.murdererName) {
    store.addStory(makeStory(repository.manifest.win_message));
    return c.json({ win: true, message: repository.manifest.win_message, state: store.getState() });
  }
  store.addStory(makeStory(repository.manifest.lose_message));
  return c.json({ win: false, message: repository.manifest.lose_message, state: store.getState() });
});

// ── POST /api/search ──

app.post("/api/search", async (c) => {
  const parsed = await parseBody<SearchRequest>(c, searchRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const state = store.getState();

  if (state.game_over) {
    return c.json({ error: "游戏已结束", state: store.getState() });
  }

  const clue = store.getUndiscoveredClue(body.location_id);
  if (!clue) {
    const scene = store.getSearchFallbackScene(body.location_id);
    const loc = repository.manifest.search_locations.find((l) => l.id === body.location_id);
    const locName = loc?.name ?? body.location_id;
    return c.json({
      scene,
      clue: "该房间暂时没有更多可发现的线索",
      story: `【搜索 ${locName}】${scene}`,
      state: store.getState(),
    });
  }

  if (store.advanceRound()) {
    return c.json({ game_over: true, state: store.getState() });
  }

  const loc = repository.manifest.search_locations.find((l) => l.id === body.location_id);
  const locName = loc?.name ?? body.location_id;
  const locDesc = loc ? `${loc.floor}的${loc.name}，${loc.description}` : body.location_id;
  const scene = `你在${locName}仔细搜索，${clue}`;

  let story: string;
  try {
    const llm = getLlm();
    const prompt = buildSearchStoryPrompt(
      locName, locDesc, state.days,
      flattenStories(state.stories), clue, state.current_npc,
      repository.manifest.search_story_prompt, repository.manifest.title,
    );
    const raw = await llm.completeRaw({ messages: [{ role: "user", content: prompt }] });
    story = raw.replace("正文：", "").trim();
    if (!story) story = `【搜索 ${locName}】${scene}`;
  } catch {
    story = `【搜索 ${locName}】${scene}`;
  }

  store.addClue({
    location_id: body.location_id,
    location_name: locName,
    scene,
    clue,
  });
  store.addStory(makeStory(story));

  return c.json({ scene, clue, story, state: store.getState() });
});

// ── POST /api/chat ──

app.post("/api/chat", async (c) => {
  const parsed = await parseBody<ChatRequest>(c, chatRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const state = store.getState();

  if (state.game_over) {
    return c.json({ error: "游戏已结束" });
  }

  const snap = store.createSnapshot();

  if (store.advanceRound()) {
    return c.json({ game_over: true, state: store.getState() });
  }

  const npc = state.current_npc;
  const llm = getLlm();
  const prompt = buildNpcChatPrompt(
    npc, state.days, repository.npcSecrets[npc],
    repository.loadNpcScript(repository.npcScriptMap[npc]),
    flattenStories(state.stories), body.message,
    repository.manifest.npc_chat_prompt, repository.manifest.title,
  );

  const { thinking, reply, story: storyText } = await llm.complete({
    messages: [{ role: "user", content: prompt }],
  });

  store.addChatMessage(npc, { role: "player", content: body.message, _snap: snap });
  store.addChatMessage(npc, { role: "npc", content: reply });
  store.addStory(makeStoryWithThinking(storyText, thinking));

  return c.json({ reply, story: storyText, thinking, prompt, state: store.getState() });
});

// ── POST /api/chat/stream ──

app.post("/api/chat/stream", async (c) => {
  const parsed = await parseBody<ChatRequest>(c, chatRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const state = store.getState();

  if (state.game_over) {
    return c.json({ error: "游戏已结束" });
  }

  const snap = store.createSnapshot();

  if (store.advanceRound()) {
    return streamSSE(c, async (stream) => {
      const event: SSEEvent = { type: "game_over", state: store.getState() };
      await stream.writeSSE({ data: JSON.stringify(event) });
    });
  }

  const npc = state.current_npc;
  const llm = getLlm();
  const prompt = buildNpcChatPrompt(
    npc, state.days, repository.npcSecrets[npc],
    repository.loadNpcScript(repository.npcScriptMap[npc]),
    flattenStories(state.stories), body.message,
    repository.manifest.npc_chat_prompt, repository.manifest.title,
  );

  return streamSSE(c, async (stream) => {
    let fullText = "";

    try {
      for await (const token of llm.stream({ messages: [{ role: "user", content: prompt }] })) {
        fullText += token;
        const event: SSEEvent = { type: "token", content: token };
        await stream.writeSSE({ data: JSON.stringify(event) });
      }
    } catch {
      const errEvent: SSEEvent = { type: "token", content: "（大模型断线）" };
      await stream.writeSSE({ data: JSON.stringify(errEvent) });
      const fallEvent: SSEEvent = { type: "token", content: "寒风呼啸，大雪封山。" };
      await stream.writeSSE({ data: JSON.stringify(fallEvent) });
    }

    const { thinking, reply, story: storyText } = parseLlmOutput(fullText);

    store.addChatMessage(npc, { role: "player", content: body.message, _snap: snap });
    store.addChatMessage(npc, { role: "npc", content: reply });
    store.addStory(makeStoryWithThinking(storyText, thinking));

    const doneEvent: SSEEvent = { type: "done", prompt, state: store.getState() };
    await stream.writeSSE({ data: JSON.stringify(doneEvent) });
  });
});

// ── POST /api/undo-and-resend ──

app.post("/api/undo-and-resend", async (c) => {
  const parsed = await parseBody<UndoResendRequest>(c, undoResendRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const state = store.getState();

  if (state.game_over) {
    return c.json({ error: "游戏已结束" });
  }

  const history = state.chat_history[body.npc_name];
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
  store.truncateChatHistory(body.npc_name, body.message_index);

  const npc = body.npc_name;
  const llm = getLlm();
  const prompt = buildNpcChatPrompt(
    npc, state.days, repository.npcSecrets[npc],
    repository.loadNpcScript(repository.npcScriptMap[npc]),
    flattenStories(state.stories), body.new_message,
    repository.manifest.npc_chat_prompt, repository.manifest.title,
  );

  const { thinking, reply, story: storyText } = await llm.complete({
    messages: [{ role: "user", content: prompt }],
  });

  const newSnap = store.createSnapshot();
  store.addChatMessage(npc, { role: "player", content: body.new_message, _snap: newSnap });
  store.addChatMessage(npc, { role: "npc", content: reply });
  store.addStory(makeStoryWithThinking(storyText, thinking));

  return c.json({ reply, story: storyText, thinking, prompt, state: store.getState() });
});

export default app;
