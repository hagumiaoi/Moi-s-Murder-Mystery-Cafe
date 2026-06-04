// ── API Types (shared between frontend and backend) ──

export interface ChatMessage {
  role: "player" | "npc";
  content: string;
  _snap?: SnapShot;
}

export interface NpcInfo {
  name: string;
  id: string;
}

export interface TimelineEvent {
  day: number;
  time: string;
  event: string;
}

export interface SearchLocation {
  id: string;
  name: string;
  description: string;
}

export interface ClueEntry {
  location_id: string;
  location_name: string;
  scene: string;
  clue: string;
}

export interface ScriptInfo {
  title: string;
  description: string;
  max_days: number;
  rounds_per_day: number;
  npcs: NpcInfo[];
  timeline: TimelineEvent[];
  search_locations: SearchLocation[];
}

export interface StoryEntry {
  story: string;
  thinking?: string;
}

export interface GameState {
  days: number;
  rounds: number;
  current_npc: string;
  game_over: boolean;
  stories: (string | StoryEntry)[];
  chat_history: Record<string, ChatMessage[]>;
  clues: ClueEntry[];
}

export interface ChatResponse {
  reply: string;
  story: string;
  thinking?: string;
  prompt: string;
  state: GameState;
  game_over?: boolean;
  error?: string;
}

export interface AccuseResponse {
  win: boolean;
  message: string;
  state: GameState;
}

export interface SearchResponse {
  scene: string;
  clue: string;
  story: string;
  prompt?: string;
  state: GameState;
  game_over?: boolean;
  error?: string;
}

// ── Domain Types (backend-internal) ──

export interface NpcDef {
  id: string;
  name: string;
  script_file: string;
  core_secret: string;
  is_murderer: boolean;
}

export interface SearchLocationDef {
  id: string;
  name: string;
  floor: string;
  description: string;
  clues: string[];
}

export interface Manifest {
  title: string;
  description: string;
  max_days: number;
  rounds_per_day: number;
  first_npc?: string;
  win_message: string;
  lose_message: string;
  timeout_message: string;
  day_transition: string;
  npc_chat_prompt: string;
  search_story_prompt: string;
  timeline: TimelineEvent[];
  search_locations: SearchLocationDef[];
  npcs: NpcDef[];
}

export interface SnapShot {
  rounds: number;
  days: number;
  story_len: number;
  clue_len: number;
  npc: string;
}

// ── Request Types ──

export interface ChatRequest {
  message: string;
}

export interface SelectNPCRequest {
  npc_name: string;
}

export interface AccuseRequest {
  target: string;
}

export interface SearchRequest {
  location_id: string;
}

export interface UndoResendRequest {
  npc_name: string;
  message_index: number;
  new_message: string;
}

// ── SSE Stream Types ──

export type SSEEvent =
  | { type: "token"; content: string }
  | { type: "done"; prompt?: string; state: GameState }
  | { type: "game_over"; state: GameState };
