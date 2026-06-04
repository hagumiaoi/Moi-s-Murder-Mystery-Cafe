import { useState } from "react";
import type { PanelProps } from "./registry";
import { RotateCcw, Wrench } from "../layout/workspace/icons";
import * as api from "../api";

export default function SettingsPanel({ state, gameActions, lastPrompt }: PanelProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [debugConfirmed, setDebugConfirmed] = useState(false);
  const [debugPromptText, setDebugPromptText] = useState("");
  const [debugManifest, setDebugManifest] = useState<Record<string, unknown> | null>(null);
  const [debugState, setDebugState] = useState<Record<string, unknown> | null>(null);
  const [debugUnavailable, setDebugUnavailable] = useState(false);
  const [debugError, setDebugError] = useState("");

  const enableDebug = () => {
    if (!debugConfirmed && !window.confirm("将暴露 Prompt、隐藏事实和结案答案。确定要启用调试模式吗？")) return;
    setDebugConfirmed(true);
    setShowDebug(true);
  };

  const handleDebugError = (err: unknown) => {
    if (err instanceof api.ApiError && err.status === 403) {
      setDebugUnavailable(true);
      setDebugError("后端未启用 debug.enabled，调试数据不可用。");
      return;
    }
    setDebugError("调试数据加载失败。");
  };

  const resetDebugStatus = () => {
    setDebugUnavailable(false);
    setDebugError("");
  };

  const loadPrompt = async () => {
    resetDebugStatus();
    try {
      const res = await api.debugPrompt({
        interaction_id: "talk",
        target_entity: state.current_entity,
        text: "（调试请求）",
      });
      setDebugPromptText(res.prompt);
    } catch (err) {
      handleDebugError(err);
    }
  };

  const loadManifest = async () => {
    resetDebugStatus();
    try {
      const m = await api.debugManifest();
      setDebugManifest(m);
    } catch (err) {
      handleDebugError(err);
    }
  };

  const loadState = async () => {
    resetDebugStatus();
    try {
      const s = await api.debugState();
      setDebugState(s);
    } catch (err) {
      handleDebugError(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <h3>游戏控制</h3>
        <button className="reset-btn" onClick={async () => { await gameActions.reset(); }} style={{ width: "100%" }}>
          <RotateCcw size={14} style={{ marginRight: 4, display: "inline" }} />重新开始
        </button>

        <hr />
        <h3>游戏状态</h3>
        <pre style={{ fontSize: 11, opacity: 0.7 }}>
          {JSON.stringify({
            phase: state.phase,
            step: state.step,
            current_entity: state.current_entity,
            game_over: state.game_over,
            ending: state.ending,
            stories: state.stories.length,
            clues: state.clues.length,
            revealed_facts: state.revealed_facts.length,
            discovered_evidence: state.discovered_evidence.length,
          }, null, 2)}
        </pre>

        <hr />
        <h3><Wrench size={14} style={{ marginRight: 4, display: "inline" }} />开发调试</h3>
        {!debugConfirmed ? (
          <button onClick={enableDebug} style={{ width: "100%" }}>启用调试模式</button>
        ) : (
          <div>
            <button onClick={() => setShowDebug(!showDebug)} style={{ width: "100%", marginBottom: 8 }}>
              {showDebug ? "收起调试" : "展开调试"}
            </button>
            {showDebug && (
              <div>
                {debugUnavailable && (
                  <p style={{ color: "#d68a57", fontSize: 12 }}>
                    调试 API 未启用。请在后端配置 `debug.enabled = true` 后重启服务。
                  </p>
                )}
                {!debugUnavailable && debugError && (
                  <p style={{ color: "#d68a57", fontSize: 12 }}>{debugError}</p>
                )}
                <button onClick={loadPrompt} style={{ width: "100%", marginBottom: 4 }}>加载当前 Prompt</button>
                {debugPromptText && (
                  <textarea readOnly value={debugPromptText} rows={12} style={{ width: "100%", background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-light)", fontSize: "var(--text-sm)", marginBottom: 8 }} />
                )}
                <button onClick={loadManifest} style={{ width: "100%", marginBottom: 4 }}>加载完整 Manifest</button>
                {debugManifest && (
                  <textarea readOnly value={JSON.stringify(debugManifest, null, 2)} rows={12} style={{ width: "100%", background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-light)", fontSize: 11 }} />
                )}
                <button onClick={loadState} style={{ width: "100%", marginBottom: 4 }}>加载完整状态</button>
                {debugState && (
                  <textarea readOnly value={JSON.stringify(debugState, null, 2)} rows={12} style={{ width: "100%", background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-light)", fontSize: 11 }} />
                )}
                {lastPrompt && (
                  <div style={{ marginTop: 8 }}>
                    <strong>上次 Prompt:</strong>
                    <textarea readOnly value={lastPrompt} rows={8} style={{ width: "100%", background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-light)", fontSize: 11, marginTop: 4 }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
