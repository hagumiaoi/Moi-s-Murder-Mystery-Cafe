import type { GameState, InteractionInput, InteractionResponse } from "./types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export async function getInfo(): Promise<Record<string, unknown>> {
  return request("/info");
}

export async function getState(): Promise<GameState> {
  return request("/state");
}

export async function newGame(): Promise<GameState> {
  return request("/new-game", { method: "POST" });
}

export async function interact(input: InteractionInput): Promise<InteractionResponse> {
  return request("/interact", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function selectEntity(entity_id: string): Promise<GameState> {
  return request("/select-entity", {
    method: "POST",
    body: JSON.stringify({ entity_id }),
  });
}

export async function undoAndResend(entity_id: string, message_index: number, new_message: string): Promise<{
  reply?: string;
  story: string;
  thinking?: string;
  prompt?: string;
  state: GameState;
}> {
  return request("/undo-and-resend", {
    method: "POST",
    body: JSON.stringify({ entity_id, message_index, new_message }),
  });
}

export async function interactStream(
  input: InteractionInput,
  onToken: (token: string) => void,
  onDone: (state: GameState, prompt?: string) => void,
  onError?: () => void,
) {
  try {
    const res = await fetch(`${BASE}/interact/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      onError?.();
      return;
    }
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
          if (data.type === "game_over") onDone(data.state);
        } catch { /* ignore parse errors */ }
      }
    }
  } catch {
    onError?.();
  }
}

export async function debugPrompt(input: InteractionInput): Promise<{ prompt: string }> {
  return request("/debug/prompt", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function debugManifest(): Promise<Record<string, unknown>> {
  return request("/debug/manifest");
}

export async function debugState(): Promise<Record<string, unknown>> {
  return request("/debug/state");
}
