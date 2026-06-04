import type { StoryEntry, ClueEntry, ChatMessage, SnapShot, Manifest } from "@shared/types";
import { repository } from "../script/repository.ts";

export interface GameStore {
  reset(): void;
  getState(): GameStateData;
  setState(data: GameStateData): void;

  advanceRound(): boolean;
  switchNpc(npcName: string): void;
  addStory(entry: StoryEntry): void;
  addClue(entry: ClueEntry): void;
  addChatMessage(npc: string, msg: ChatMessage): void;

  getUndiscoveredClue(locationId: string): string | null;
  getSearchFallbackScene(locationId: string): string;

  createSnapshot(): SnapShot;
  restoreSnapshot(snap: SnapShot): void;
  truncateChatHistory(npc: string, index: number): void;
}

export interface GameStateData {
  days: number;
  rounds: number;
  current_npc: string;
  game_over: boolean;
  stories: (string | StoryEntry)[];
  chat_history: Record<string, ChatMessage[]>;
  clues: ClueEntry[];
}

function makeStoryEntry(story: string, thinking?: string): StoryEntry {
  const entry: StoryEntry = { story };
  if (thinking) entry.thinking = thinking;
  return entry;
}

export class MemoryGameStore implements GameStore {
  private state!: GameStateData;

  constructor() {
    this.reset();
  }

  reset(): void {
    const chatHistory: Record<string, ChatMessage[]> = {};
    for (const name of repository.npcNames) {
      chatHistory[name] = [];
    }
    this.state = {
      days: 1,
      rounds: 0,
      current_npc: repository.firstNpc,
      game_over: false,
      stories: [],
      chat_history: chatHistory,
      clues: [],
    };
  }

  getState(): GameStateData {
    return this.state;
  }

  setState(data: GameStateData): void {
    this.state = data;
  }

  advanceRound(): boolean {
    const manifest = repository.manifest;
    this.state.rounds += 1;
    if (this.state.rounds >= manifest.rounds_per_day) {
      this.state.rounds = 0;
      this.state.days += 1;
      this.state.stories.push(
        makeStoryEntry(manifest.day_transition.replace("{day}", String(this.state.days))),
      );
    }
    if (this.state.days > manifest.max_days) {
      this.state.game_over = true;
      this.state.stories.push(makeStoryEntry(manifest.timeout_message));
      return true;
    }
    return false;
  }

  switchNpc(npcName: string): void {
    if (repository.npcNames.includes(npcName)) {
      this.state.current_npc = npcName;
    }
  }

  addStory(entry: StoryEntry): void {
    this.state.stories.push(entry);
  }

  addClue(entry: ClueEntry): void {
    this.state.clues.push(entry);
  }

  addChatMessage(npc: string, msg: ChatMessage): void {
    this.state.chat_history[npc].push(msg);
  }

  getUndiscoveredClue(locationId: string): string | null {
    const loc = repository.manifest.search_locations.find((l) => l.id === locationId);
    if (!loc) return null;
    const discovered = new Set(
      this.state.clues
        .filter((c) => c.location_id === locationId)
        .map((c) => c.clue),
    );
    for (const clue of loc.clues) {
      if (!discovered.has(clue)) return clue;
    }
    return null;
  }

  getSearchFallbackScene(locationId: string): string {
    const loc = repository.manifest.search_locations.find((l) => l.id === locationId);
    const locName = loc?.name ?? locationId;
    return `你在${locName}仔细搜索了一遍，但没有发现更多线索。`;
  }

  createSnapshot(): SnapShot {
    return {
      rounds: this.state.rounds,
      days: this.state.days,
      story_len: this.state.stories.length,
      clue_len: this.state.clues.length,
      npc: this.state.current_npc,
    };
  }

  restoreSnapshot(snap: SnapShot): void {
    this.state.rounds = snap.rounds;
    this.state.days = snap.days;
    this.state.stories = this.state.stories.slice(0, snap.story_len);
    this.state.clues = this.state.clues.slice(0, snap.clue_len);
    this.state.current_npc = snap.npc;
  }

  truncateChatHistory(npc: string, index: number): void {
    this.state.chat_history[npc] = this.state.chat_history[npc].slice(0, index);
  }
}
