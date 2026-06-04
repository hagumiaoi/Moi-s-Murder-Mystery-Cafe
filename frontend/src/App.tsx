import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatBox from "./components/ChatBox";
import StoryPanel from "./components/StoryPanel";
import FloatingPanel from "./components/FloatingPanel/FloatingPanel";
import * as api from "./api";
import type { GameState, ScriptInfo } from "./types";
import "./App.css";

export default function App() {
  const [script, setScript] = useState<ScriptInfo | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [storyCollapsed, setStoryCollapsed] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingStory, setStreamingStory] = useState("");

  useEffect(() => {
    api.getInfo().then(setScript).catch(() => {});
    api.getState().then(setState).catch(() => {});
  }, []);

  const handleSend = useCallback(async (message: string) => {
    setLoading(true);
    setStreamingReply("");
    setStreamingStory("");

    let fullText = "";
    let replyStart = -1;
    let storyStart = -1;

    const onToken = (token: string) => {
      fullText += token;

      if (replyStart < 0) {
        replyStart = fullText.indexOf("NPC回复：");
      }
      if (storyStart < 0 && replyStart >= 0) {
        storyStart = fullText.indexOf("正文：", replyStart);
      }

      if (replyStart >= 0) {
        const replyEnd = storyStart >= 0 ? storyStart : fullText.length;
        setStreamingReply(fullText.slice(replyStart + "NPC回复：".length, replyEnd).trimStart());
      }
      if (storyStart >= 0) {
        setStreamingStory(fullText.slice(storyStart + "正文：".length).trimStart());
      }
    };

    const onDone = (newState: GameState, prompt?: string) => {
      setState(newState);
      if (prompt) setLastPrompt(prompt);
      setStreamingReply("");
      setStreamingStory("");
      setLoading(false);
    };

    const onError = () => {
      // fallback: try non-streaming
      setLoading(true);
      api.sendMessage(message).then((res) => {
        if (res.state) setState(res.state);
        if (res.prompt) setLastPrompt(res.prompt);
      }).catch(() => {}).finally(() => setLoading(false));
    };

    api.sendMessageStream(message, onToken, onDone, onError);
  }, []);

  const handleSearch = useCallback(async (locationId: string) => {
    setLoading(true);
    try {
      const res = await api.searchLocation(locationId);
      if (res.state) setState(res.state);
      if (res.prompt) setLastPrompt(res.prompt);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const handleSelectNpc = useCallback(async (name: string) => {
    const newState = await api.selectNPC(name);
    setState(newState);
  }, []);

  const handleAccuse = useCallback(async (target: string) => {
    const res = await api.accuse(target);
    if (res.state) setState(res.state);
  }, []);

  const handleUndoResend = useCallback(async (npcName: string, msgIndex: number, newMsg: string) => {
    setLoading(true);
    try {
      const res = await api.undoAndResend(npcName, msgIndex, newMsg);
      if (res.state) setState(res.state);
      if (res.prompt) setLastPrompt(res.prompt);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const handleReset = useCallback(async () => {
    try {
      const newState = await api.newGame();
      setState(newState);
    } catch {
      setState(null);
    }
  }, []);

  if (!script || !state) {
    return <div className="loading-screen">加载中...</div>;
  }

  const currentMessages = state.chat_history[state.current_npc] || [];
  const npcs = script.npcs.map((n) => n.name);

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>{script.title}</h1>
        <button className="reset-btn" onClick={handleReset}>
          🔄 重新开始
        </button>
      </header>
      <div className="app-body">
        <Sidebar
          npcs={npcs}
          days={state.days}
          rounds={state.rounds}
          maxDays={script.max_days}
          roundsPerDay={script.rounds_per_day}
          currentNpc={state.current_npc}
          gameOver={state.game_over}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectNpc={handleSelectNpc}
          onAccuse={handleAccuse}
        />
        <main className="main-area">
          {loading && <div className="loading-overlay">思考中...</div>}
          {state.game_over && (
            <div className="game-banner">
              🎮 游戏已结束 - 点击"重新开始"再来一局
            </div>
          )}
          <ChatBox
            currentNpc={state.current_npc}
            messages={currentMessages}
            gameOver={state.game_over}
            collapsed={chatCollapsed}
            searchLocations={script.search_locations}
            onSend={handleSend}
            onSearch={handleSearch}
            onUndoResend={handleUndoResend}
            onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
            streamingReply={streamingReply}
          />
          <StoryPanel
            stories={state.stories ?? []}
            collapsed={storyCollapsed}
            onToggleCollapse={() => setStoryCollapsed(!storyCollapsed)}
            streamingStory={streamingStory}
          />
          <div className="bottom-bar">
            <div className="search-bar">
              <SearchDropdown
                locations={script.search_locations}
                gameOver={state.game_over}
                onSearch={handleSearch}
              />
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "8px 20px 12px" }}>
              <form
                className="chat-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget.elements.namedItem("msg") as HTMLInputElement);
                  if (!input.value.trim() || state.game_over) return;
                  handleSend(input.value.trim());
                  input.value = "";
                }}
                style={{ flex: 1, padding: 0, display: "flex", gap: 8 }}
              >
                <input
                  className="chat-input"
                  name="msg"
                  placeholder="输入你的审问问题..."
                  disabled={state.game_over}
                />
                <button type="submit" className="send-btn" disabled={state.game_over}>
                  发送
                </button>
              </form>
              {lastPrompt && (
                <button
                  className="prompt-toggle-btn"
                  type="button"
                  onClick={() => {
                    if (!showPrompt && !window.confirm("开发使用，点开可能会造成剧情泄露，你确定要打开吗？")) return;
                    setShowPrompt(!showPrompt);
                  }}
                  title="查看发送给AI的完整Prompt"
                >
                  ⚠️
                </button>
              )}
            </div>
            {showPrompt && lastPrompt && (
              <textarea
                className="prompt-debug"
                readOnly
                value={lastPrompt}
                rows={8}
              />
            )}
          </div>
        </main>
        <FloatingPanel
          timeline={script.timeline}
          clues={state.clues}
        />
      </div>
    </div>
  );
}

function SearchDropdown({
  locations,
  gameOver,
  onSearch,
}: {
  locations: { id: string; name: string; description: string }[];
  gameOver: boolean;
  onSearch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="search-toggle-btn"
        type="button"
        onClick={() => setOpen(!open)}
        disabled={gameOver}
      >
        🔍 搜集线索（消耗1轮）
      </button>
      {open && (
        <div className="search-dropdown">
          {locations.map((loc) => (
            <button
              key={loc.id}
              className="search-location-btn"
              type="button"
              onClick={() => {
                onSearch(loc.id);
                setOpen(false);
              }}
            >
              <strong>{loc.name}</strong>
              <span className="loc-desc">{loc.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
