import type { StoryEntry, ClueEntry, ChatMessage, SnapShot } from "@shared/types";
import { repository } from "../script/repository.ts";

export interface GameStore {
  reset(): void;
  getState(): GameStateData;

  advanceRound(): boolean;
  switchEntity(entityId: string): void;
  setGameOver(ending: string): void;
  addStory(entry: StoryEntry): void;
  addClue(entry: ClueEntry): void;
  addChatMessage(entityId: string, msg: ChatMessage): void;

  getUndiscoveredClue(locationId: string): string | null;
  getSearchFallbackScene(locationId: string): string;
  revealFact(factId: string): void;
  discoverEvidence(evidenceId: string): void;

  createSnapshot(): SnapShot;
  restoreSnapshot(snap: SnapShot): void;
  truncateChatHistory(entityId: string, index: number): void;
}

export interface GameStateData {
  phase: number;
  step: number;
  current_entity: string;
  game_over: boolean;
  ending?: string;
  stories: (string | StoryEntry)[];
  chat_history: Record<string, ChatMessage[]>;
  clues: ClueEntry[];
  revealed_facts: string[];
  discovered_evidence: string[];
}

export class MemoryGameStore implements GameStore {
  private state!: GameStateData;

  constructor() {
    this.reset();
  }

  reset(): void {
    const chatHistory: Record<string, ChatMessage[]> = {};
    for (const entity of repository.manifest.entities.filter((e) => e.kind === "person")) {
      chatHistory[entity.id] = [];
    }
    const firstEntityId = repository.firstEntityId();
    this.state = {
      phase: 0,
      step: 0,
      current_entity: firstEntityId,
      game_over: false,
      stories: [],
      chat_history: chatHistory,
      clues: [],
      revealed_facts: [],
      discovered_evidence: [],
    };
  }

  getState(): GameStateData {
    return this.state;
  }

  advanceRound(): boolean {
    const prog = repository.manifest.progression;
    if (prog.type === "free") return false;

    this.state.step += 1;
    if (this.state.step >= (prog.config?.per_phase ?? 10)) {
      this.state.step = 0;
      this.state.phase += 1;

      const labels = prog.config?.labels ?? [];
      const label = labels[this.state.phase] ?? `第${this.state.phase + 1}天`;
      const template = prog.config?.transition_template ?? "⏳ 夜幕降临... 时间来到了 {label}。";
      this.state.stories.push({
        story: template.replace("{label}", label).replace("{day}", String(this.state.phase + 1)),
      });
    }

    const max = prog.config?.max ?? 7;
    if (this.state.phase >= max) {
      this.state.game_over = true;
      this.state.ending = "timeout";
      this.state.stories.push({ story: repository.manifest.resolution.endings.timeout ?? repository.manifest.resolution.endings.failed });
      return true;
    }
    return false;
  }

  switchEntity(entityId: string): void {
    const entity = repository.getEntityById(entityId);
    if (entity && entity.kind === "person") {
      this.state.current_entity = entityId;
    }
  }

  setGameOver(ending: string): void {
    this.state.game_over = true;
    this.state.ending = ending;
  }

  addStory(entry: StoryEntry): void {
    this.state.stories.push(entry);
  }

  addClue(entry: ClueEntry): void {
    this.state.clues.push(entry);
  }

  addChatMessage(entityId: string, msg: ChatMessage): void {
    if (!this.state.chat_history[entityId]) {
      this.state.chat_history[entityId] = [];
    }
    this.state.chat_history[entityId].push(msg);
  }

  getUndiscoveredClue(locationId: string): string | null {
    const clues = repository.getCluesForEntity(locationId);
    if (clues.length === 0) return null;
    const discovered = new Set(
      this.state.clues
        .filter((c) => c.location_id === locationId)
        .map((c) => c.clue),
    );
    for (const clue of clues) {
      if (!discovered.has(clue)) return clue;
    }
    return null;
  }

  getSearchFallbackScene(locationId: string): string {
    const entity = repository.getEntityById(locationId);
    const name = entity?.name ?? locationId;
    return `你在${name}仔细搜索了一遍，但没有发现更多线索。`;
  }

  createSnapshot(): SnapShot {
    return {
      rounds: this.state.step,
      days: this.state.phase,
      story_len: this.state.stories.length,
      clue_len: this.state.clues.length,
      npc: this.state.current_entity,
    };
  }

  restoreSnapshot(snap: SnapShot): void {
    this.state.phase = snap.days;
    this.state.step = snap.rounds;
    this.state.stories = this.state.stories.slice(0, snap.story_len);
    this.state.clues = this.state.clues.slice(0, snap.clue_len);
    this.state.current_entity = snap.npc;
  }

  truncateChatHistory(entityId: string, index: number): void {
    if (this.state.chat_history[entityId]) {
      this.state.chat_history[entityId] = this.state.chat_history[entityId].slice(0, index);
    }
  }

  revealFact(factId: string): void {
    if (!this.state.revealed_facts.includes(factId)) {
      this.state.revealed_facts.push(factId);
    }
  }

  discoverEvidence(evidenceId: string): void {
    if (!this.state.discovered_evidence.includes(evidenceId)) {
      this.state.discovered_evidence.push(evidenceId);
    }
  }
}
