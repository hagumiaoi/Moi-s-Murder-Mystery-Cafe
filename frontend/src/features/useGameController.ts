import { useCallback, useState } from "react";
import * as api from "../api";
import type { GameState } from "../types";

export function useGameController() {
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingStory, setStreamingStory] = useState("");

  const handleSend = useCallback(async (message: string): Promise<GameState | null> => {
    setLoading(true);
    setStreamingReply("");
    setStreamingStory("");

    return new Promise((resolve) => {
      let fullText = "";
      let replyStart = -1;
      let storyStart = -1;

      const onToken = (token: string) => {
        fullText += token;
        if (replyStart < 0) replyStart = fullText.indexOf("NPC回复：");
        if (storyStart < 0 && replyStart >= 0) storyStart = fullText.indexOf("正文：", replyStart);
        if (replyStart >= 0) {
          const replyEnd = storyStart >= 0 ? storyStart : fullText.length;
          setStreamingReply(fullText.slice(replyStart + "NPC回复：".length, replyEnd).trimStart());
        }
        if (storyStart >= 0) {
          setStreamingStory(fullText.slice(storyStart + "正文：".length).trimStart());
        }
      };

      const onDone = (newState: GameState, prompt?: string) => {
        if (prompt) setLastPrompt(prompt);
        setStreamingReply("");
        setStreamingStory("");
        setLoading(false);
        resolve(newState);
      };

      const onError = () => {
        setLoading(true);
        api.sendMessage(message).then((res) => {
          if (res.prompt) setLastPrompt(res.prompt);
          resolve(res.state ?? null);
        }).catch(() => {
          resolve(null);
        }).finally(() => setLoading(false));
      };

      api.sendMessageStream(message, onToken, onDone, onError);
    });
  }, []);

  const handleSearch = useCallback(async (locationId: string): Promise<GameState | null> => {
    setLoading(true);
    try {
      const res = await api.searchLocation(locationId);
      if (res.prompt) setLastPrompt(res.prompt);
      return res.state ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectNpc = useCallback(async (name: string): Promise<GameState> => {
    return api.selectNPC(name);
  }, []);

  const handleAccuse = useCallback(async (target: string): Promise<GameState | null> => {
    const res = await api.accuse(target);
    return res.state ?? null;
  }, []);

  const handleUndoResend = useCallback(async (npcName: string, msgIndex: number, newMsg: string): Promise<GameState | null> => {
    setLoading(true);
    try {
      const res = await api.undoAndResend(npcName, msgIndex, newMsg);
      if (res.prompt) setLastPrompt(res.prompt);
      return res.state ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(async (): Promise<GameState | null> => {
    try {
      return await api.newGame();
    } catch {
      return null;
    }
  }, []);

  return {
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
  };
}
