import type { StoryEntry } from "@shared/types";

export function buildNpcChatPrompt(npcName: string, day: number, coreSecret: string, npcScript: string, storyContext: string, playerInput: string, template: string, title: string): string {
  return template
    .replace(/{title}/g, title)
    .replace(/{npc_name}/g, npcName)
    .replace(/{day}/g, String(day))
    .replace(/{core_secret}/g, coreSecret)
    .replace(/{npc_script}/g, npcScript)
    .replace(/{story_context}/g, storyContext)
    .replace(/{player_input}/g, playerInput);
}

export function buildSearchStoryPrompt(locationName: string, locationDesc: string, day: number, storyContext: string, clueText: string, npcName: string, template: string, title: string): string {
  return template
    .replace(/{title}/g, title)
    .replace(/{location_name}/g, locationName)
    .replace(/{location_desc}/g, locationDesc)
    .replace(/{day}/g, String(day))
    .replace(/{story_context}/g, storyContext)
    .replace(/{clue_text}/g, clueText)
    .replace(/{npc_name}/g, npcName);
}

export function flattenStories(stories: (string | StoryEntry)[]): string {
  const texts = stories.map((s) => (typeof s === "string" ? s : s.story));
  return texts.join("\n\n") || "（故事尚未开始）";
}
