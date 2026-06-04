import { describe, it, expect, beforeEach } from "bun:test";
import { MemoryGameStore } from "../src/game/store";

describe("MemoryGameStore", () => {
  let store: MemoryGameStore;

  beforeEach(() => {
    store = new MemoryGameStore();
  });

  describe("reset", () => {
    it("initializes with phase 0, step 0, first person entity, not game over", () => {
      const state = store.getState();
      expect(state.phase).toBe(0);
      expect(state.step).toBe(0);
      expect(state.current_entity).toBe("butler");
      expect(state.game_over).toBe(false);
      expect(state.stories).toEqual([]);
      expect(state.clues).toEqual([]);
      expect(state.revealed_facts).toEqual([]);
      expect(state.discovered_evidence).toEqual([]);
    });

    it("creates empty chat_history keyed by entity.id for all person entities", () => {
      const state = store.getState();
      const keys = Object.keys(state.chat_history);
      expect(keys.length).toBe(3);
      expect(keys).toContain("butler");
      expect(keys).toContain("doctor");
      expect(keys).toContain("rose");
      for (const hist of Object.values(state.chat_history)) {
        expect(hist).toEqual([]);
      }
    });
  });

  describe("advanceRound", () => {
    it("increments step counter", () => {
      const gameOver = store.advanceRound();
      expect(store.getState().step).toBe(1);
      expect(gameOver).toBe(false);
    });

    it("advances phase when step reaches per_phase (10)", () => {
      for (let i = 0; i < 10; i++) {
        store.advanceRound();
      }
      const state = store.getState();
      expect(state.phase).toBe(1);
      expect(state.step).toBe(0);
      expect(state.stories.length).toBeGreaterThanOrEqual(1);
    });

    it("triggers game_over when phase reaches max (7)", () => {
      for (let i = 0; i < 70; i++) {
        store.advanceRound();
      }
      const state = store.getState();
      expect(state.game_over).toBe(true);
      expect(state.phase).toBe(7);
    });
  });

  describe("switchEntity", () => {
    it("changes current_entity when given valid person ID", () => {
      store.switchEntity("doctor");
      expect(store.getState().current_entity).toBe("doctor");
    });

    it("ignores invalid entity IDs", () => {
      store.switchEntity("nonexistent");
      expect(store.getState().current_entity).toBe("butler");
    });
  });

  describe("clue discovery", () => {
    it("returns first undiscovered clue for a location", () => {
      const clue = store.getUndiscoveredClue("lobby");
      expect(clue).toBe("茶几上有一只白兰地酒杯，杯底有少量琥珀色酒液残留");
    });

    it("returns next clue after previous is discovered", () => {
      store.addClue({ location_id: "lobby", location_name: "大厅", scene: "test", clue: "茶几上有一只白兰地酒杯，杯底有少量琥珀色酒液残留" });
      const nextClue = store.getUndiscoveredClue("lobby");
      expect(nextClue).toBe("茶几上有一只紫砂茶杯，杯沿外侧有一道深红色唇膏印痕");
    });

    it("returns null when all clues discovered", () => {
      const clues = [
        "茶几上有一只白兰地酒杯，杯底有少量琥珀色酒液残留",
        "茶几上有一只紫砂茶杯，杯沿外侧有一道深红色唇膏印痕",
        "壁炉内有大量木柴燃烧后的灰烬和未燃尽的木炭",
      ];
      for (const c of clues) {
        store.addClue({ location_id: "lobby", location_name: "大厅", scene: "test", clue: c });
      }
      expect(store.getUndiscoveredClue("lobby")).toBeNull();
    });
  });

  describe("snapshot and restore", () => {
    it("captures current state with entity id", () => {
      store.advanceRound();
      store.advanceRound();
      store.addClue({ location_id: "lobby", location_name: "大厅", scene: "s", clue: "c" });
      const snap = store.createSnapshot();
      expect(snap.rounds).toBe(2);
      expect(snap.days).toBe(0);
      expect(snap.story_len).toBe(0);
      expect(snap.clue_len).toBe(1);
      expect(snap.npc).toBe("butler");
    });

    it("restores state including entity from snapshot", () => {
      store.switchEntity("doctor");
      store.advanceRound();
      store.addClue({ location_id: "lobby", location_name: "大厅", scene: "s", clue: "c" });
      const snap = store.createSnapshot();
      store.advanceRound();
      store.switchEntity("rose");
      store.restoreSnapshot(snap);
      const state = store.getState();
      expect(state.step).toBe(1);
      expect(state.clues.length).toBe(1);
      expect(state.current_entity).toBe("doctor");
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

  describe("truncateChatHistory", () => {
    it("uses entity.id as chat key", () => {
      store.addChatMessage("butler", { role: "player", content: "msg1" });
      store.addChatMessage("butler", { role: "npc", content: "reply1" });
      store.addChatMessage("butler", { role: "player", content: "msg2" });
      expect(store.getState().chat_history["butler"].length).toBe(3);
      store.truncateChatHistory("butler", 1);
      expect(store.getState().chat_history["butler"].length).toBe(1);
    });
  });

  describe("fact and evidence tracking", () => {
    it("tracks revealed facts with dedup", () => {
      store.revealFact("f_test");
      store.revealFact("f_test");
      expect(store.getState().revealed_facts).toEqual(["f_test"]);
    });

    it("tracks discovered evidence", () => {
      store.discoverEvidence("e_test");
      expect(store.getState().discovered_evidence).toEqual(["e_test"]);
    });
  });

  describe("addChatMessage", () => {
    it("creates chat history entry for new entity IDs", () => {
      store.addChatMessage("unknown", { role: "player", content: "test" });
      expect(store.getState().chat_history["unknown"]).toBeDefined();
      expect(store.getState().chat_history["unknown"].length).toBe(1);
    });
  });
});
