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
