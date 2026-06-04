import type { InteractionInput } from "@shared/types";
import { repository } from "../script/repository.ts";
import { createLlmClient } from "./client.ts";
import { flattenStories } from "./prompts.ts";
import type { GameStore } from "../game/store.ts";
import type { SnapShot } from "@shared/types";

const llm = createLlmClient();

export interface InteractionResult {
  reply?: string;
  story: string;
  thinking?: string;
  prompt?: string;
  error?: string;
  game_over?: boolean;
  ending?: string;
  win?: boolean;
  message?: string;
  revealed_facts?: string[];
  discovered_evidence?: string[];
}

function buildTalkPrompt(targetEntity: string, phase: number, storyCtx: string, playerInput: string): string {
  const secret = repository.getEntitySecret(targetEntity);
  const script = repository.getEntityScript(targetEntity);
  if (!script) return "";

  const entity = repository.getEntityById(targetEntity);
  const entityName = entity?.name ?? targetEntity;
  const template = repository.manifest.prompts.npc_chat;

  return template
    .replace(/\{entity_name\}/g, entityName)
    .replace(/\{npc_name\}/g, entityName)
    .replace(/\{entity_secret\}/g, secret)
    .replace(/\{core_secret\}/g, secret)
    .replace(/\{entity_script\}/g, script)
    .replace(/\{npc_script\}/g, script)
    .replace(/\{story_context\}/g, storyCtx)
    .replace(/\{player_input\}/g, playerInput)
    .replace(/\{title\}/g, repository.manifest.title)
    .replace(/\{day\}/g, String(phase + 1));
}

function buildSearchPrompt(locationId: string, phase: number, storyCtx: string, clueText: string, currentEntityId: string): string {
  const entity = repository.getEntityById(locationId);
  const locName = entity?.name ?? locationId;
  const locDesc = entity?.description ?? locationId;
  const currentName = repository.getEntityById(currentEntityId)?.name ?? currentEntityId;
  const template = repository.manifest.prompts.search;

  return template
    .replace(/\{location_name\}/g, locName)
    .replace(/\{location_desc\}/g, locDesc)
    .replace(/\{day\}/g, String(phase + 1))
    .replace(/\{story_context\}/g, storyCtx)
    .replace(/\{clue_text\}/g, clueText)
    .replace(/\{npc_name\}/g, currentName)
    .replace(/\{entity_name\}/g, currentName)
    .replace(/\{title\}/g, repository.manifest.title);
}

function buildConfrontPrompt(targetEntity: string, phase: number, storyCtx: string, playerInput: string, evidenceIds: string[]): string {
  const secret = repository.getEntitySecret(targetEntity);
  const script = repository.getEntityScript(targetEntity);
  const entity = repository.getEntityById(targetEntity);
  const entityName = entity?.name ?? targetEntity;

  const evidenceList = evidenceIds
    .map((eid) => {
      const ev = repository.manifest.evidence.find((e) => e.id === eid);
      return ev ? `- ${ev.title}: ${ev.description}` : `- ${eid}`;
    })
    .join("\n");

  const template = repository.manifest.prompts.confront ?? "";
  if (!template) return buildTalkPrompt(targetEntity, phase, storyCtx, playerInput);

  return template
    .replace(/\{entity_name\}/g, entityName)
    .replace(/\{entity_secret\}/g, secret)
    .replace(/\{entity_script\}/g, script)
    .replace(/\{story_context\}/g, storyCtx)
    .replace(/\{player_input\}/g, playerInput)
    .replace(/\{evidence_list\}/g, evidenceList)
    .replace(/\{title\}/g, repository.manifest.title)
    .replace(/\{day\}/g, String(phase + 1));
}

export async function runInteraction(
  input: InteractionInput,
  store: GameStore,
  playerSnapshot?: SnapShot,
): Promise<InteractionResult> {
  const state = store.getState();
  if (state.game_over) {
    return { story: "", error: "游戏已结束" };
  }

  const interaction = repository.manifest.interactions.find((i) => i.id === input.interaction_id);
  if (!interaction) {
    return { story: "", error: `未知的交互类型: ${input.interaction_id}` };
  }

  if (interaction.type === "submit-resolution") {
    return runResolution(input, store);
  }

  const targetId = input.target_entity || state.current_entity;
  const targetEntity = repository.getEntityById(targetId);

  if (interaction.type === "talk" || interaction.type === "confront") {
    if (!targetEntity || targetEntity.kind !== "person") {
      return { story: "", error: "交谈对象必须是人物" };
    }

    const storyCtx = flattenStories(state.stories);
    const prompt = interaction.type === "confront"
      ? buildConfrontPrompt(targetId, state.phase, storyCtx, input.text ?? "", input.evidence_ids ?? [])
      : buildTalkPrompt(targetId, state.phase, storyCtx, input.text ?? "");

    if (!prompt) return { story: "", error: "无法生成对话 Prompt" };

    try {
      const { thinking, reply, story: storyText } = await llm.complete({
        messages: [{ role: "user", content: prompt }],
      });
      store.addChatMessage(targetEntity.id, { role: "player", content: input.text ?? "", _snap: playerSnapshot });
      store.addChatMessage(targetEntity.id, { role: "npc", content: reply });
      store.addStory({ story: storyText, thinking });
      return { reply, story: storyText, thinking, prompt };
    } catch {
      return { story: "", error: "LLM 调用失败" };
    }
  }

  if (interaction.type === "search") {
    const clue = store.getUndiscoveredClue(targetId);
    if (!clue) {
      const scene = store.getSearchFallbackScene(targetId);
      const locName = targetEntity?.name ?? targetId;
      return { story: `【搜索 ${locName}】${scene}`, error: "该房间暂时没有更多可发现的线索" };
    }

    const locName = targetEntity?.name ?? targetId;
    const scene = `你在${locName}仔细搜索，${clue}`;
    const storyCtx = flattenStories(state.stories);

    let story: string;
    try {
      const prompt = buildSearchPrompt(targetId, state.phase, storyCtx, clue, state.current_entity);
      const raw = await llm.completeRaw({ messages: [{ role: "user", content: prompt }] });
      story = raw.replace("正文：", "").trim();
      if (!story) story = `【搜索 ${locName}】${scene}`;
    } catch {
      story = `【搜索 ${locName}】${scene}`;
    }

    store.addClue({ location_id: targetId, location_name: locName, scene, clue });

    const matchedEvidence = repository.manifest.evidence.find(
      (ev) => ev.source_entity === targetId && ev.description === clue,
    );
    if (matchedEvidence) {
      store.discoverEvidence(matchedEvidence.id);
      if (matchedEvidence.reveals) {
        for (const factId of matchedEvidence.reveals) store.revealFact(factId);
      }
    }

    store.addStory({ story });
    return { story };
  }

  if (interaction.type === "inspect") {
    const entityName = targetEntity?.name ?? targetId;
    const entityDesc = targetEntity?.description ?? targetId;
    const storyCtx = flattenStories(state.stories);
    const template = repository.manifest.prompts.inspect ?? "";

    if (template) {
      const prompt = template
        .replace(/\{entity_name\}/g, entityName)
        .replace(/\{entity_desc\}/g, entityDesc)
        .replace(/\{day\}/g, String(state.phase + 1))
        .replace(/\{story_context\}/g, storyCtx)
        .replace(/\{title\}/g, repository.manifest.title);

      try {
        const raw = await llm.completeRaw({ messages: [{ role: "user", content: prompt }] });
        const story = raw.replace("正文：", "").trim();
        store.addStory({ story });
        return { story };
      } catch (err) {
        console.warn("inspect LLM call failed:", err);}
    }

    const fallback = `你仔细检查了「${entityName}」，但没有发现新的线索。`;
    store.addStory({ story: fallback });
    return { story: fallback };
  }

  return { story: "", error: `未实现的交互类型: ${interaction.type}` };
}

function runResolution(input: InteractionInput, store: GameStore): InteractionResult {
  const m = repository.manifest;
  const answers = input.answers ?? [];
  const state = store.getState();

  let correctCount = 0;
  const total = m.resolution.required_questions.length;

  for (const qid of m.resolution.required_questions) {
    const question = repository.getQuestionById(qid);
    if (!question?.answer) continue;

    const submitted = answers.find((a) => a.question_id === qid);
    if (!submitted) continue;

    switch (question.type) {
      case "single-entity": {
        const correct = String(question.answer);
        const given = typeof submitted.answer === "string" ? submitted.answer : submitted.answer[0];
        if (given === correct) correctCount++;
        break;
      }
      case "multi-entity": {
        const correct = Array.isArray(question.answer) ? question.answer : [question.answer];
        const given = Array.isArray(submitted.answer) ? submitted.answer : [submitted.answer];
        if (correct.length === given.length && correct.every((c) => given.includes(String(c)))) correctCount++;
        break;
      }
      case "choice": {
        const correct = String(question.answer);
        const given = typeof submitted.answer === "string" ? submitted.answer : submitted.answer[0];
        if (given === correct) correctCount++;
        break;
      }
      case "evidence-set": {
        const correct = Array.isArray(question.answer) ? question.answer : [question.answer];
        const given = Array.isArray(submitted.answer) ? submitted.answer : [submitted.answer];
        if (correct.length === given.length && correct.every((c) => given.includes(String(c)))) correctCount++;
        break;
      }
      case "text-rubric": {
        const rubric = question.rubric ?? [];
        const given = typeof submitted.answer === "string" ? submitted.answer : (Array.isArray(submitted.answer) ? submitted.answer.join(" ") : "");
        const matchCount = rubric.filter((kw) => given.includes(kw)).length;
        if (rubric.length > 0 && matchCount >= Math.ceil(rubric.length * 0.5)) correctCount++;
        break;
      }
    }
  }

  const passScore = m.resolution.pass_score ?? 1;
  const passRatio = total > 0 ? correctCount / total : 0;
  let win: boolean;

  if (total > 0 && passRatio >= 1) {
    win = true;
  } else if (correctCount >= passScore) {
    win = true;
  } else {
    win = false;
  }

  const ending = win
    ? (passRatio >= 1 ? m.resolution.endings.perfect : (m.resolution.endings.partial ?? m.resolution.endings.perfect))
    : m.resolution.endings.failed;
  const endingType = passRatio >= 1 ? "perfect" : (win ? "partial" : "failed");

  store.setGameOver(endingType);
  store.addStory({ story: ending });

  return { story: ending, message: ending, win, game_over: true, ending: endingType };
}
