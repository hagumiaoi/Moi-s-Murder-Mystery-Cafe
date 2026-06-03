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
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, collapsed]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || gameOver) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className={`chat-section ${collapsed ? "collapsed" : ""}`}>
      <div className="section-header" onClick={onToggleCollapse}>
        <span>💬 对话 {currentNpc && `· ${currentNpc}`}</span>
        <span className="collapse-icon">{collapsed ? "▶" : "▼"}</span>
      </div>
      {!collapsed && (
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-empty">开始审问吧...</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role}`}>
              <div className="msg-bubble">{msg.content}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
