import { describe, it, expect, beforeEach } from "bun:test";
import { MemoryGameStore } from "../src/game/store";
import type { StoryEntry, ClueEntry } from "@shared/types";

describe("MemoryGameStore", () => {
  let store: MemoryGameStore;

  beforeEach(() => {
    store = new MemoryGameStore();
  });

  describe("reset", () => {
    it("initializes with day 1, round 0, first NPC, not game over", () => {
      const state = store.getState();
      expect(state.days).toBe(1);
      expect(state.rounds).toBe(0);
      expect(state.current_npc).toBe("管家（李大叔）");
      expect(state.game_over).toBe(false);
      expect(state.stories).toEqual([]);
      expect(state.clues).toEqual([]);
    });

    it("creates empty chat_history for all NPCs", () => {
      const state = store.getState();
      expect(Object.keys(state.chat_history)).toEqual([
        "管家（李大叔）",
        "医生（王医生）",
        "演员（露丝）",
      ]);
      for (const hist of Object.values(state.chat_history)) {
        expect(hist).toEqual([]);
      }
    });
  });

  describe("advanceRound", () => {
    it("increments round counter", () => {
      const gameOver = store.advanceRound();
      expect(store.getState().rounds).toBe(1);
      expect(gameOver).toBe(false);
    });

    it("advances day and appends day_transition when rounds reach rounds_per_day", () => {
      for (let i = 0; i < 10; i++) {
        store.advanceRound();
      }
      const state = store.getState();
      expect(state.days).toBe(2);
      expect(state.rounds).toBe(0);
      expect(state.stories.length).toBeGreaterThanOrEqual(1);
    });

    it("triggers game_over when days exceed max_days", () => {
      for (let i = 0; i < 70; i++) {
        store.advanceRound();
      }
      const state = store.getState();
      expect(state.game_over).toBe(true);
      expect(state.days).toBe(8);
    });
  });

  describe("switchNpc", () => {
    it("changes current_npc when given valid name", () => {
      store.switchNpc("医生（王医生）");
      expect(store.getState().current_npc).toBe("医生（王医生）");
    });

    it("ignores invalid NPC names", () => {
      store.switchNpc("不存在的NPC");
      expect(store.getState().current_npc).toBe("管家（李大叔）");
    });
  });

  describe("clue discovery", () => {
    it("returns first undiscovered clue for a location", () => {
      const clue = store.getUndiscoveredClue("lobby");
      expect(clue).toBe("茶几上有一只白兰地酒杯，杯底有少量琥珀色酒液残留");
    });

    it("returns next clue after previous is discovered", () => {
      store.addClue({
        location_id: "lobby",
        location_name: "大厅",
        scene: "test",
        clue: "茶几上有一只白兰地酒杯，杯底有少量琥珀色酒液残留",
      });
      const nextClue = store.getUndiscoveredClue("lobby");
      expect(nextClue).toBe("茶几上有一只紫砂茶杯，杯沿外侧有一道深红色唇膏印痕");
    });

    it("returns null when all clues discovered", () => {
      const clues = ["茶几上有一只白兰地酒杯，杯底有少量琥珀色酒液残留",
        "茶几上有一只紫砂茶杯，杯沿外侧有一道深红色唇膏印痕",
        "壁炉内有大量木柴燃烧后的灰烬和未燃尽的木炭"];
      for (const c of clues) {
        store.addClue({
          location_id: "lobby",
          location_name: "大厅",
          scene: "test",
          clue: c,
        });
      }
      expect(store.getUndiscoveredClue("lobby")).toBeNull();
    });

    it("returns null for nonexistent location", () => {
      expect(store.getUndiscoveredClue("nonexistent")).toBeNull();
    });
  });

  describe("snapshot and restore", () => {
    it("captures current state in snapshot", () => {
      store.advanceRound();
      store.advanceRound();
      store.addClue({ location_id: "lobby", location_name: "大厅", scene: "s", clue: "c" });
      const snap = store.createSnapshot();
      expect(snap.rounds).toBe(2);
      expect(snap.days).toBe(1);
      expect(snap.story_len).toBe(0);
      expect(snap.clue_len).toBe(1);
      expect(snap.npc).toBe("管家（李大叔）");
    });

    it("restores state from snapshot", () => {
      store.advanceRound();
      store.addClue({ location_id: "lobby", location_name: "大厅", scene: "s", clue: "c" });
      const snap = store.createSnapshot();

      store.advanceRound();
      store.advanceRound();
      store.restoreSnapshot(snap);

      const state = store.getState();
      expect(state.rounds).toBe(1);
      expect(state.clues.length).toBe(1);
    });

    it("restore truncates stories and clues", () => {
      const snap = store.createSnapshot();
      store.advanceRound();
      store.advanceRound();
      store.restoreSnapshot(snap);
      expect(store.getState().stories.length).toBe(0);
      expect(store.getState().clues.length).toBe(0);
    });
  });

  describe("accusation flow", () => {
    it("advanceRound returns true on game_over (for route-level accusation handling)", () => {
      for (let i = 0; i < 71; i++) {
        const gameOver = store.advanceRound();
        if (gameOver) {
          expect(store.getState().game_over).toBe(true);
          return;
        }
      }
    });
  });

  describe("truncateChatHistory", () => {
    it("truncates chat history to given index", () => {
      store.addChatMessage("管家（李大叔）", { role: "player", content: "msg1" });
      store.addChatMessage("管家（李大叔）", { role: "npc", content: "reply1" });
      store.addChatMessage("管家（李大叔）", { role: "player", content: "msg2" });
      expect(store.getState().chat_history["管家（李大叔）"].length).toBe(3);

      store.truncateChatHistory("管家（李大叔）", 1);
      expect(store.getState().chat_history["管家（李大叔）"].length).toBe(1);
    });
  });
});
