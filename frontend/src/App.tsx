import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "./api";
import type { GameState, PanelDef } from "./types";
import type { ScriptInfoData, WorkspacePanel, GameActions } from "./panels/registry";
import { registerPanel, getPanel } from "./panels/registry";
import EntityListPanel from "./panels/EntityListPanel";
import InteractionPanel from "./panels/InteractionPanel";
import NarrativePanel from "./panels/NarrativePanel";
import CaseFilePanel from "./panels/CaseFilePanel";
import ResolutionPanel from "./panels/ResolutionPanel";
import SettingsPanel from "./panels/SettingsPanel";
import UnknownPanel from "./panels/UnknownPanel";
import {
  WorkspaceShell,
  WorkspaceDock,
  useWorkspaceLayout,
  useWorkspaceKeyboard,
} from "./layout/workspace";
import type { CeorlShellHandle } from "./layout/workspace";
import { useGameController } from "./features/useGameController";
import { RotateCcw, Gamepad2 } from "./layout/workspace/icons";
import "./App.css";

registerPanel("entity-list", EntityListPanel);
registerPanel("interaction", InteractionPanel);
registerPanel("narrative", NarrativePanel);
registerPanel("case-file", CaseFilePanel);
registerPanel("resolution", ResolutionPanel);
registerPanel("settings", SettingsPanel);

export default function App() {
  const [script, setScript] = useState<ScriptInfoData | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  const refreshInfo = useCallback(async () => {
    const data = await api.getInfo();
    setScript(data as unknown as ScriptInfoData);
  }, []);

  const manifestPanels: WorkspacePanel[] = (script?.panels ?? []).map((p: PanelDef) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    icon: p.icon,
    width: p.width,
    filter: p.filter as WorkspacePanel["filter"],
    sections: p.sections,
    config: p.config,
  }));

  const { columns, activeIndex, setActiveIndex } = useWorkspaceLayout(manifestPanels);
  const shellRef = useRef<CeorlShellHandle>(null);
  const {
    loading,
    lastPrompt,
    streamingReply,
    streamingStory,
    handleSend,
    handleSearch,
    handleSelectEntity,
    handleUndoResend,
    handleReset,
  } = useGameController();

  useEffect(() => {
    refreshInfo().catch(() => {});
    api.getState().then(setState).catch(() => {});
  }, [refreshInfo]);

  useWorkspaceKeyboard(activeIndex, columns.length, useCallback((i: number) => {
    setActiveIndex(i);
    shellRef.current?.focusColumn(i);
  }, [setActiveIndex]));

  const dockSelect = (index: number) => {
    setActiveIndex(index);
    shellRef.current?.focusColumn(index);
  };

  if (!script || !state) {
    return <div className="loading-screen">加载中...</div>;
  }

  const currentEntityId = state.current_entity;

  const gameActions: GameActions = {
    sendMessage: async (text: string) => {
      const s = await handleSend(text, currentEntityId);
      if (s) {
        setState(s);
        await refreshInfo().catch(() => {});
      }
      return s;
    },
    search: async (locationId: string) => {
      const s = await handleSearch(locationId);
      if (s) {
        setState(s);
        await refreshInfo().catch(() => {});
      }
      return s;
    },
    selectEntity: async (name: string) => {
      const entity = (script.entities ?? []).find((e) => e.name === name);
      if (entity) {
        const s = await handleSelectEntity(entity.id);
        if (s) setState(s);
        return s;
      }
      return null;
    },
    submitResolution: async (answers) => {
      const res = await api.interact({
        interaction_id: "submit-resolution",
        answers,
      });
      if (res.state) {
        setState(res.state);
        await refreshInfo().catch(() => {});
      }
      return res.state ?? null;
    },
    undoResend: async (_entityId: string, msgIndex: number, newMsg: string) => {
      const s = await handleUndoResend(currentEntityId, msgIndex, newMsg);
      if (s) {
        setState(s);
        await refreshInfo().catch(() => {});
      }
      return s;
    },
    reset: async () => {
      const s = await handleReset();
      if (s) {
        setState(s);
        await refreshInfo().catch(() => {});
      }
      return s;
    },
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header className="app-header" style={{ flexShrink: 0 }}>
        <h1>{script.title}</h1>
        <button className="reset-btn" onClick={async () => { await gameActions.reset(); }}>
          <RotateCcw size={14} style={{ marginRight: 4, display: "inline" }} />重新开始
        </button>
        {loading && <span style={{ marginLeft: 12, opacity: 0.6 }}>思考中...</span>}
      </header>
      {state.game_over && (
        <div className="game-banner" style={{ flexShrink: 0 }}>
          <Gamepad2 size={14} style={{ marginRight: 4, display: "inline" }} />游戏已结束 - 点击"重新开始"再来一局
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WorkspaceShell
          ref={shellRef}
          columns={columns}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
          renderColumn={(col, i) => {
            const PanelComponent = getPanel(col.type);

            const panelInfo: WorkspacePanel = {
              id: col.id,
              type: col.type,
              title: col.title,
              icon: col.icon,
              width: col.width as WorkspacePanel["width"],
              filter: col.filter,
              sections: col.sections,
              config: col.config,
            };

            const content = PanelComponent ? (
              <PanelComponent
                script={script}
                state={state}
                gameActions={gameActions}
                panel={panelInfo}
                streamingReply={streamingReply}
                streamingStory={streamingStory}
                loading={loading}
                lastPrompt={lastPrompt}
              />
            ) : (
              <UnknownPanel
                script={script}
                state={state}
                gameActions={gameActions}
                panel={panelInfo}
              />
            );

            return (
              <div
                onClick={() => { if (i !== activeIndex) dockSelect(i); }}
                style={{ height: "100%", cursor: i !== activeIndex ? "pointer" : "default" }}
              >
                {content}
              </div>
            );
          }}
        />
      </div>
      <WorkspaceDock columns={columns} activeIndex={activeIndex} onSelect={dockSelect} />
    </div>
  );
}
