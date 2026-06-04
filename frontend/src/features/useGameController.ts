import { useCallback, useState } from "react";
import * as api from "../api";
import type { GameState, InteractionInput } from "../types";

export function useGameController() {
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingStory, setStreamingStory] = useState("");

  const handleSend = useCallback(async (text: string, entityId: string): Promise<GameState | null> => {
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
        const input: InteractionInput = {
          interaction_id: "talk",
          target_entity: entityId,
          text,
        };
        api.interact(input).then((res) => {
          if (res.prompt) setLastPrompt(res.prompt);
          resolve(res.state ?? null);
        }).catch(() => resolve(null)).finally(() => setLoading(false));
      };

      const input: InteractionInput = {
        interaction_id: "talk",
        target_entity: entityId,
        text,
      };
      api.interactStream(input, onToken, onDone, onError);
    });
  }, []);

  const handleSearch = useCallback(async (locationId: string): Promise<GameState | null> => {
    setLoading(true);
    try {
      const input: InteractionInput = {
        interaction_id: "search",
        target_entity: locationId,
      };
      const res = await api.interact(input);
      if (res.prompt) setLastPrompt(res.prompt);
      return res.state ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectEntity = useCallback(async (entityId: string): Promise<GameState> => {
    return api.selectEntity(entityId);
  }, []);

  const handleUndoResend = useCallback(async (entityId: string, msgIndex: number, newMsg: string): Promise<GameState | null> => {
    setLoading(true);
    try {
      const res = await api.undoAndResend(entityId, msgIndex, newMsg);
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
    handleSelectEntity,
    handleUndoResend,
    handleReset,
  };
}
