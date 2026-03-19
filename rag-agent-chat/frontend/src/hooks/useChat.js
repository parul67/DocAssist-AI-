import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fetchDocuments, sendChatMessage, uploadDocument } from "../services/api";
import { useStreaming } from "./useStreaming";

const STORAGE_KEY = "rag-agent-chat-sessions";
const THEME_KEY = "rag-agent-theme";

function createSession() {
  const sessionId = crypto.randomUUID();
  return {
    id: sessionId,
    sessionId,
    title: "New conversation",
    createdAt: new Date().toISOString(),
    messages: [],
    selectedDocIds: [],
  };
}

function normalizeSource(source, index) {
  return {
    id: source.id || `${source.document_name || source.source_file || "source"}-${index}`,
    chunkText: source.chunk_text || source.text || "",
    documentName: source.document_name || source.source_file || "Unknown document",
    score:
      typeof source.similarity_score === "number"
        ? source.similarity_score
        : typeof source.score === "number"
          ? source.score
          : null,
  };
}

function normalizeDocuments(payload) {
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return items.map((item, index) => ({
    id: item.id || item.doc_id || item.file_name || item.filename || `document-${index}`,
    name: item.name || item.file_name || item.filename || `Document ${index + 1}`,
    uploadedAt: item.uploaded_at || item.created_at || new Date().toISOString(),
  }));
}

export function useChat() {
  const [sessions, setSessions] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [createSession()];
    }

    try {
      const parsed = JSON.parse(saved);
      return parsed.length ? parsed : [createSession()];
    } catch {
      return [createSession()];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    try {
      const parsed = JSON.parse(saved);
      return parsed[0]?.id || null;
    } catch {
      return null;
    }
  });
  const [documents, setDocuments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isFetchingDocuments, setIsFetchingDocuments] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_KEY) || "dark");
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const pendingMessageIdRef = useRef(null);
  const { isStreaming, startStreaming, stopStreaming } = useStreaming();

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [activeSessionId, sessions]
  );

  useEffect(() => {
    if (!activeSessionId && sessions[0]?.id) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    void refreshDocuments();
  }, []);

  const updateSession = (sessionId, updater) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }
        return updater(session);
      })
    );
  };

  const refreshDocuments = async () => {
    setIsFetchingDocuments(true);
    try {
      const response = await fetchDocuments();
      setDocuments(normalizeDocuments(response));
    } catch {
      toast.error("Could not load documents.");
    } finally {
      setIsFetchingDocuments(false);
    }
  };

  const createNewChat = () => {
    const next = createSession();
    setSessions((current) => [next, ...current]);
    setActiveSessionId(next.id);
  };

  const selectSession = (sessionId) => {
    setActiveSessionId(sessionId);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const toggleDocumentSelection = (docId) => {
    if (!activeSession) {
      return;
    }

    updateSession(activeSession.id, (session) => {
      const selectedDocIds = session.selectedDocIds.includes(docId)
        ? session.selectedDocIds.filter((id) => id !== docId)
        : [...session.selectedDocIds, docId];

      return {
        ...session,
        selectedDocIds,
      };
    });
  };

  const uploadFile = async (file) => {
    setUploadProgress(0);

    try {
      const response = await uploadDocument(file, setUploadProgress);
      const filename =
        response?.data?.filename ||
        response?.data?.file_name ||
        response?.data?.id ||
        file.name;

      await refreshDocuments();
      toast.success(`${filename} uploaded successfully.`);
      setUploadProgress(100);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Upload failed.");
      setUploadProgress(0);
    }
  };

  const appendAssistantPlaceholder = (sessionId) => {
    const assistantMessageId = crypto.randomUUID();
    pendingMessageIdRef.current = assistantMessageId;

    updateSession(sessionId, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          sources: [],
          isStreaming: true,
        },
      ],
    }));
  };

  const finalizeAssistantMessage = (sessionId, updates) => {
    const pendingId = pendingMessageIdRef.current;
    if (!pendingId) {
      return;
    }

    updateSession(sessionId, (session) => ({
      ...session,
      title:
        session.title === "New conversation" && session.messages[0]?.content
          ? session.messages[0].content.slice(0, 36)
          : session.title,
      messages: session.messages.map((message) =>
        message.id === pendingId
          ? {
              ...message,
              ...updates,
              isStreaming: false,
            }
          : message
      ),
    }));

    pendingMessageIdRef.current = null;
  };

  const updateAssistantContent = (sessionId, token, extra = {}) => {
    const pendingId = pendingMessageIdRef.current;
    if (!pendingId) {
      return;
    }

    updateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === pendingId
          ? {
              ...message,
              content: `${message.content}${token || ""}`,
              ...extra,
            }
          : message
      ),
    }));
  };

  const sendMessage = async (question, { regenerate = false } = {}) => {
    if (!activeSession || !question.trim()) {
      return;
    }

    const sessionId = activeSession.id;
    const prompt = question.trim();
    setIsSending(true);

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    updateSession(sessionId, (session) => {
      const trimmedMessages = regenerate
        ? [...session.messages].filter((message, index, messages) => {
            const isLastMessage = index === messages.length - 1;
            return !(isLastMessage && message.role === "assistant");
          })
        : session.messages;

      return {
        ...session,
        title: session.title === "New conversation" ? prompt.slice(0, 36) : session.title,
        messages: regenerate ? trimmedMessages : [...trimmedMessages, userMessage],
      };
    });

    appendAssistantPlaceholder(sessionId);

    const payload = {
      question: prompt,
      query: prompt,
      session_id: activeSession.sessionId,
      doc_ids: activeSession.selectedDocIds,
    };

    try {
      if (streamingEnabled) {
        let finalSources = [];

        try {
          await startStreaming({
            question: prompt,
            sessionId: activeSession.sessionId,
            docIds: activeSession.selectedDocIds,
            onChunk: (chunk) => {
              if (chunk.sources) {
                finalSources = chunk.sources.map(normalizeSource);
              }

              if (chunk.answer) {
                finalizeAssistantMessage(sessionId, {
                  content: chunk.answer,
                  sources: finalSources,
                });
                return;
              }

              updateAssistantContent(sessionId, chunk.token || chunk.delta || "", {
                sources: finalSources,
              });
            },
          });

          finalizeAssistantMessage(sessionId, {});
          return;
        } catch (error) {
          if (error.name !== "AbortError") {
            const streamUnavailable =
              error?.status === 404 ||
              error.message?.includes("404") ||
              error.message?.toLowerCase().includes("not found") ||
              error.message?.toLowerCase().includes("stream");
            if (!streamUnavailable) {
              throw error;
            }
          } else {
            finalizeAssistantMessage(sessionId, {
              content: "Response stopped.",
              sources: [],
            });
            return;
          }
        }
      } else {
        const response = await sendChatMessage(payload);
        const answer = response?.data?.answer || response?.answer || "No answer returned.";
        const rawSources = response?.data?.sources || response?.sources || [];

        finalizeAssistantMessage(sessionId, {
          content: answer,
          sources: rawSources.map(normalizeSource),
        });
        return;
      }

      const response = await sendChatMessage(payload);
      const answer = response?.data?.answer || response?.answer || "No answer returned.";
      const rawSources = response?.data?.sources || response?.sources || [];

      finalizeAssistantMessage(sessionId, {
        content: answer,
        sources: rawSources.map(normalizeSource),
      });
    } catch (error) {
      const fallbackError =
        error?.response?.data?.detail ||
        error?.message ||
        "The assistant could not respond right now.";

      finalizeAssistantMessage(sessionId, {
        content: fallbackError,
        sources: [],
      });
      toast.error("Message failed.");
    } finally {
      setIsSending(false);
    }
  };

  const regenerateLast = async () => {
    const lastUserMessage = [...(activeSession?.messages || [])]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage) {
      return;
    }

    await sendMessage(lastUserMessage.content, { regenerate: true });
  };

  return {
    activeSession,
    documents,
    isFetchingDocuments,
    isSending,
    isStreaming,
    createNewChat,
    selectSession,
    sessions,
    sendMessage,
    regenerateLast,
    stopStreaming,
    toggleDocumentSelection,
    uploadFile,
    uploadProgress,
    refreshDocuments,
    theme,
    toggleTheme,
    streamingEnabled,
    setStreamingEnabled,
  };
}
