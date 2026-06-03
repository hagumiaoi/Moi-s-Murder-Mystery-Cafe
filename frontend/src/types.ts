export interface ChatMessage {
  role: "player" | "npc";
  content: string;
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

export interface GameState {
  days: number;
  rounds: number;
  current_npc: string;
  game_over: boolean;
  stories: string[];
  chat_history: Record<string, ChatMessage[]>;
  clues: ClueEntry[];
}

export interface ChatResponse {
  reply: string;
  story: string;
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
  prompt: string;
  state: GameState;
  game_over?: boolean;
  error?: string;
}
