import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function sendChatMessage(payload) {
  const { data } = await apiClient.post("/chat", payload);
  return data;
}

export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (!onProgress || !progressEvent.total) {
        return;
      }
      const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(progress);
    },
  });

  return data;
}

export async function fetchDocuments() {
  try {
    const { data } = await apiClient.get("/documents");
    return data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return { success: true, data: [] };
    }
    throw error;
  }
}

export async function streamChatMessage({ question, sessionId, docIds = [], signal, onChunk }) {
  const url = new URL(`${API_BASE_URL}/chat/stream`);
  url.searchParams.set("question", question);
  url.searchParams.set("session_id", sessionId);
  docIds.forEach((docId) => url.searchParams.append("doc_ids", docId));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
    },
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(
      errorText || `Streaming request failed with status ${response.status}.`
    );
    error.status = response.status;
    throw error;
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const lines = chunk
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        const payload = line.startsWith("data:") ? line.slice(5).trim() : line;

        if (!payload || payload === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          onChunk(parsed);
        } catch {
          onChunk({ token: payload });
        }
      }
    }
  }
}
