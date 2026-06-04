import { z } from "zod";

export const npcDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  script_file: z.string(),
  core_secret: z.string(),
  is_murderer: z.boolean(),
});

export const searchLocationDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  floor: z.string(),
  description: z.string(),
  clues: z.array(z.string()),
});

export const timelineEventSchema = z.object({
  day: z.number(),
  time: z.string(),
  event: z.string(),
});

export const manifestSchema = z.object({
  title: z.string(),
  description: z.string(),
  max_days: z.number().int().positive(),
  rounds_per_day: z.number().int().positive(),
  first_npc: z.string().optional(),
  win_message: z.string(),
  lose_message: z.string(),
  timeout_message: z.string(),
  day_transition: z.string(),
  npc_chat_prompt: z.string(),
  search_story_prompt: z.string(),
  timeline: z.array(timelineEventSchema),
  search_locations: z.array(searchLocationDefSchema),
  npcs: z.array(npcDefSchema),
});

export type Manifest = z.infer<typeof manifestSchema>;
