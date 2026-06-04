import { useState, useEffect, useCallback, useRef } from "react";
import ChatBox from "./components/ChatBox";
import StoryPanel from "./components/StoryPanel";
import * as api from "./api";
import type { GameState, ScriptInfo } from "./types";
import {
  WorkspaceShell,
  WorkspaceDock,
  useWorkspaceLayout,
  useWorkspaceKeyboard,
} from "./layout/workspace";
import type { CeorlShellHandle } from "./layout/workspace";
import { useGameController } from "./features/useGameController";
import "./App.css";

export default function App() {
  const [script, setScript] = useState<ScriptInfo | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const { columns, activeIndex, setActiveIndex, focusColumn } = useWorkspaceLayout();
  const shellRef = useRef<CeorlShellHandle>(null);
  const {
    loading,
    lastPrompt,
    streamingReply,
    streamingStory,
    handleSend,
    handleSearch,
    handleSelectNpc,
    handleAccuse,
    handleUndoResend,
    handleReset,
  } = useGameController();

  useEffect(() => {
    api.getInfo().then(setScript).catch(() => {});
    api.getState().then(setState).catch(() => {});
  }, []);

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

  const currentMessages = state.chat_history[state.current_npc] || [];
  const npcs = script.npcs.map((n) => n.name);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header className="app-header" style={{ flexShrink: 0 }}>
        <h1>{script.title}</h1>
        <button className="reset-btn" onClick={async () => {
          const s = await handleReset();
          if (s) setState(s);
        }}>
          🔄 重新开始
        </button>
        {loading && <span style={{ marginLeft: 12, opacity: 0.6 }}>思考中...</span>}
      </header>
      {state.game_over && (
        <div className="game-banner" style={{ flexShrink: 0 }}>
          🎮 游戏已结束 - 点击"重新开始"再来一局
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WorkspaceShell
          ref={shellRef}
          columns={columns}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
          renderColumn={(col, i) => {
            const wrapper = (children: React.ReactNode) => (
              <div
                onClick={() => { if (i !== activeIndex) dockSelect(i); }}
                style={{ height: "100%", cursor: i !== activeIndex ? "pointer" : "default" }}
              >
                {children}
              </div>
            );
            switch (col.type) {
              case "investigation":
                return wrapper(
                  <div style={{ padding: 16 }}>
                    <h3>📊 第 {state.days} / {script.max_days} 天</h3>
                    <p>今日对话: {state.rounds} / {script.rounds_per_day}</p>
                    <hr />
                    <h3>👥 审问对象</h3>
                    <div className="npc-radio-group">
                      {npcs.map((name) => (
                        <label key={name} className="npc-radio">
                          <input
                            type="radio"
                            name="npc"
                            value={name}
                            checked={state.current_npc === name}
                            onChange={async () => {
                              const s = await handleSelectNpc(name);
                              setState(s);
                            }}
                            disabled={state.game_over}
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                    <hr />
                    <AccusePanel npcs={npcs} gameOver={state.game_over} onAccuse={async (t) => {
                      const s = await handleAccuse(t);
                      if (s) setState(s);
                    }} />
                    <hr />
                    <SearchDropdown
                      locations={script.search_locations}
                      gameOver={state.game_over}
                      onSearch={async (id) => {
                        const s = await handleSearch(id);
                        if (s) setState(s);
                      }}
                    />
                  </div>
                );
              case "interrogation":
                return wrapper(
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
                      <ChatBox
                        currentNpc={state.current_npc}
                        messages={currentMessages}
                        collapsed={false}
                        onToggleCollapse={() => {}}
                        onUndoResend={async (npc, idx, msg) => {
                          const s = await handleUndoResend(npc, idx, msg);
                          if (s) setState(s);
                        }}
                        streamingReply={streamingReply}
                        hideToggle
                      />
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const input = (e.currentTarget.elements.namedItem("msg") as HTMLInputElement);
                        if (!input.value.trim() || state.game_over || loading) return;
                        const s = await handleSend(input.value.trim());
                        if (s) setState(s);
                        input.value = "";
                      }}
                      style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}
                    >
                      <input className="chat-input" name="msg" placeholder="输入你的审问问题..." disabled={state.game_over} style={{ flex: 1 }} />
                      <button type="submit" className="send-btn" disabled={state.game_over || loading}>发送</button>
                    </form>
                  </div>
                );
              case "story-log":
                return wrapper(
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <StoryPanel stories={state.stories ?? []} collapsed={false} onToggleCollapse={() => {}} streamingStory={streamingStory} hideToggle />
                  </div>
                );
              case "dossier":
                return wrapper(
                  <div style={{ padding: 16 }}>
                    <h3>🕵️ 线索 ({state.clues.length})</h3>
                    {state.clues.length === 0 && <p>尚无发现的线索。</p>}
                    {state.clues.map((c, i) => (
                      <div key={i} style={{ marginBottom: 8, padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>
                        <strong>{c.location_name}</strong>: {c.clue}
                      </div>
                    ))}
                    <hr />
                    <h3>📅 时间线</h3>
                    {script.timeline.map((e, i) => (
                      <div key={i} style={{ marginBottom: 4, fontSize: 13, opacity: 0.7 }}>{e.time}: {e.event}</div>
                    ))}
                    <hr />
                    <h3>👥 NPC 简介</h3>
                    {script.npcs.map((n) => <div key={n.id} style={{ marginBottom: 4, fontSize: 13 }}>{n.name}</div>)}
                  </div>
                );
              case "debug":
                return wrapper(
                  <div style={{ padding: 16 }}>
                    <h3>🔧 调试</h3>
                    <button type="button" onClick={() => {
                      if (!showPrompt && !window.confirm("开发使用，点开可能会造成剧情泄露，你确定要打开吗？")) return;
                      setShowPrompt(!showPrompt);
                    }}> {showPrompt ? "隐藏 Prompt" : "显示 Prompt"}</button>
                    {showPrompt && lastPrompt && <textarea readOnly value={lastPrompt} rows={12} style={{ width: "100%", background: "#1a1210", color: "#aaa", border: "1px solid #333", fontSize: 12, marginTop: 8 }} />}
                  </div>
                );
            }
          }}
        />
      </div>
      <WorkspaceDock columns={columns} activeIndex={activeIndex} onSelect={dockSelect} />
    </div>
  );
}

function AccusePanel({ npcs, gameOver, onAccuse }: { npcs: string[]; gameOver: boolean; onAccuse: (target: string) => void }) {
  const [target, setTarget] = useState(npcs[0]);
  return (
    <div>
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={gameOver}>
        {npcs.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button className="accuse-btn" onClick={() => onAccuse(target)} disabled={gameOver} style={{ marginTop: 4 }}>🔥 发起指认</button>
    </div>
  );
}

function SearchDropdown({ locations, gameOver, onSearch }: { locations: { id: string; name: string; description: string }[]; gameOver: boolean; onSearch: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="search-toggle-btn" type="button" onClick={() => setOpen(!open)} disabled={gameOver} style={{ width: "100%" }}>🔍 搜集线索（消耗1轮）</button>
      {open && (
        <div className="search-dropdown">
          {locations.map((loc) => (
            <button key={loc.id} className="search-location-btn" type="button" onClick={() => { onSearch(loc.id); setOpen(false); }}>
              <strong>{loc.name}</strong><span className="loc-desc">{loc.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
