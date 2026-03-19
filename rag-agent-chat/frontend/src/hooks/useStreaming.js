import { useRef, useState } from "react";
import { streamChatMessage } from "../services/api";

export function useStreaming() {
  const controllerRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const stopStreaming = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsStreaming(false);
  };

  const startStreaming = async ({ question, sessionId, docIds, onChunk }) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsStreaming(true);

    try {
      await streamChatMessage({
        question,
        sessionId,
        docIds,
        signal: controller.signal,
        onChunk,
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setIsStreaming(false);
      }
    }
  };

  return {
    isStreaming,
    startStreaming,
    stopStreaming,
  };
}
