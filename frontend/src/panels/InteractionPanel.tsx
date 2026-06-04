import ChatBox from "../components/ChatBox";
import type { PanelProps } from "./registry";

export default function InteractionPanel({ script, state, gameActions, streamingReply, loading }: PanelProps) {
  const currentMessages = state.chat_history[state.current_entity] || [];
  const entity = (script.entities ?? []).find((e) => e.id === state.current_entity);
  const entityName = entity?.name ?? state.current_entity;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ChatBox
          currentNpc={entityName}
          messages={currentMessages}
          collapsed={false}
          onToggleCollapse={() => {}}
          onUndoResend={async (_npc, idx, msg) => {
            await gameActions.undoResend(state.current_entity, idx, msg);
          }}
          streamingReply={streamingReply}
          hideToggle
        />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const input = (e.currentTarget.elements.namedItem("msg") as HTMLInputElement | null);
          if (!input || !input.value.trim() || state.game_over || loading) return;
          await gameActions.sendMessage(input.value.trim());
          input.value = "";
        }}
        style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}
      >
        <input className="chat-input" name="msg" placeholder="输入你的审问问题..." disabled={state.game_over} style={{ flex: 1 }} />
        <button type="submit" className="send-btn" disabled={state.game_over || loading}>发送</button>
      </form>
    </div>
  );
}
