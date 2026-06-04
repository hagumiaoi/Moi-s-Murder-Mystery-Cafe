import type { GameState, ScriptInfo, ChatResponse, AccuseResponse, SearchResponse } from "./types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

export async function getInfo(): Promise<ScriptInfo> {
  return request("/info");
}

export async function getState(): Promise<GameState> {
  return request("/state");
}

export async function newGame(): Promise<GameState> {
  return request("/new-game", { method: "POST" });
}

export async function sendMessage(message: string): Promise<ChatResponse> {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function selectNPC(npc_name: string): Promise<GameState> {
  return request("/select-npc", {
    method: "POST",
    body: JSON.stringify({ npc_name }),
  });
}

export async function accuse(target: string): Promise<AccuseResponse> {
  return request("/accuse", {
    method: "POST",
    body: JSON.stringify({ target }),
  });
}

export async function searchLocation(location_id: string): Promise<SearchResponse> {
  return request("/search", {
    method: "POST",
    body: JSON.stringify({ location_id }),
  });
}

export async function undoAndResend(npc_name: string, message_index: number, new_message: string): Promise<ChatResponse> {
  return request("/undo-and-resend", {
    method: "POST",
    body: JSON.stringify({ npc_name, message_index, new_message }),
  });
}

export async function sendMessageStream(
  message: string,
  onToken: (token: string) => void,
  onDone: (state: GameState, prompt?: string) => void,
  onError?: () => void,
) {
  try {
    const res = await fetch(`${BASE}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "token") onToken(data.content);
          if (data.type === "done") onDone(data.state, data.prompt);
        } catch { /* ignore parse errors */ }
      }
    }
  } catch {
    onError?.();
  }
}
