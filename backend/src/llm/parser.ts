import type { LlmCompletionResult } from "./client.ts";

export function parseLlmOutput(text: string): LlmCompletionResult {
  let thinking = "";
  let reply = "";
  let story = "";

  if (text.includes("思考过程：") && text.includes("NPC回复：")) {
    thinking = text.split("思考过程：", 2)[1].split("NPC回复：", 2)[0].trim();
  }

  if (text.includes("NPC回复：")) {
    const afterNpc = text.split("NPC回复：", 2)[1];
    if (afterNpc.includes("正文：")) {
      reply = afterNpc.split("正文：", 2)[0].trim();
      story = afterNpc.split("正文：", 2)[1].trim();
    } else {
      reply = afterNpc.trim();
      story = "空气仿佛凝固了，只有壁炉里的火在噼啪作响。";
    }
  } else {
    reply = text;
    story = "空气仿佛凝固了，只有壁炉里的火在噼啪作响。";
  }

  return { thinking, reply, story };
}
