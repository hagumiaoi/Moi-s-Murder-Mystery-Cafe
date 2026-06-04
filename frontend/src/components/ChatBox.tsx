import { useState, useEffect, useRef } from "react";
import type { ChatMessage, SearchLocation } from "../types";

interface ChatBoxProps {
  currentNpc: string;
  messages: ChatMessage[];
  gameOver: boolean;
  collapsed: boolean;
  searchLocations: SearchLocation[];
  onSend: (message: string) => void;
  onSearch: (locationId: string) => void;
  onToggleCollapse: () => void;
  onUndoResend?: (npcName: string, msgIndex: number, newMsg: string) => void;
  streamingReply?: string;
}

export default function ChatBox({
  currentNpc,
  messages,
  gameOver,
  collapsed,
  searchLocations,
  onSend,
  onSearch,
  onToggleCollapse,
  onUndoResend,
  streamingReply,
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, collapsed, streamingReply]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (editingIndex !== null) editRef.current?.focus();
  }, [editingIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || gameOver) return;
    onSend(input.trim());
    setInput("");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null || !editValue.trim()) return;
    onUndoResend?.(currentNpc, editingIndex, editValue.trim());
    setEditingIndex(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValue("");
  };
  const handleEditBlur = () => {
    blurTimerRef.current = setTimeout(handleEditCancel, 150);
  };
  const handleEditFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  };
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleEditCancel();
  };

  return (
    <div className={`chat-section ${collapsed ? "collapsed" : ""}`}>
      <div className="section-header" onClick={onToggleCollapse}>
        <span>💬 对话 {currentNpc && `· ${currentNpc}`}</span>
        <span className="collapse-icon">{collapsed ? "▶" : "▼"}</span>
      </div>
      {!collapsed && (
        <div className="chat-messages">
          {messages.length === 0 && !streamingReply && (
            <p className="chat-empty">开始审问吧...</p>
          )}
          {messages.map((msg, i) => {
            if (editingIndex === i) {
              return (
                <form key={i} className="chat-msg player" onSubmit={handleEditSubmit} style={{ position: "relative" }}>
                  <input
                    ref={editRef}
                    className="chat-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleEditBlur}
                    onFocus={handleEditFocus}
                    onKeyDown={handleEditKeyDown}
                    style={{ maxWidth: "72%", fontSize: 14 }}
                  />
                  <span style={{ position: "absolute", bottom: -18, right: 0, fontSize: 11, color: "#5a4a3a" }}>
                    Enter 确认 · Esc 取消
                  </span>
                </form>
              );
            }
            return (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div
                  className="msg-bubble"
                  onClick={() => {
                    if (msg.role === "player" && onUndoResend) {
                      setEditingIndex(i);
                      setEditValue(msg.content);
                    }
                  }}
                  style={msg.role === "player" && onUndoResend ? { cursor: "pointer" } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          {streamingReply && (
            <div className="chat-msg npc">
              <div className="msg-bubble streaming">{streamingReply}<span className="cursor-blink">|</span></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}