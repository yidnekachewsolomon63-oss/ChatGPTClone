import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3777/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================================
// Conversations (chats)
// ======================================================

export const listConversations = async () => {
  const { data } = await API.get("/chat/conversations");
  return data.data.conversations;
};

export const createConversation = async (title) => {
  const { data } = await API.post(
    "/chat/conversations",
    title ? { title } : {}
  );

  return data.data.conversation;
};

export const getConversationMessages = async (chatId) => {
  const { data } = await API.get(
    `/chat/conversations/${chatId}/messages`
  );

  return data.data; // { chat, messages }
};

export const renameConversation = async (chatId, title) => {
  const { data } = await API.patch(
    `/chat/conversations/${chatId}`,
    { title }
  );

  return data.data.conversation;
};

export const deleteConversation = async (chatId) => {
  await API.delete(`/chat/conversations/${chatId}`);
};

// ======================================================
// Streaming assistant answer (Server-Sent Events)
// ======================================================

// Calls the backend SSE endpoint and invokes the callbacks
// for each event type. Resolves when the stream finishes
// (success, server error, or abort).
export const streamMessage = async ({
  chatId,
  content,
  signal,
  onUserMessage,
  onDelta,
  onDone,
  onError,
}) => {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${chatId}/messages/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
      signal,
    }
  );

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const body = await response.json();
      if (body && body.message) {
        message = body.message;
      }
    } catch {
      // keep the generic message
    }

    throw new Error(message);
  }

  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser."
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let separator;

    while ((separator = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);

      const dataLine = rawEvent
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) {
        continue;
      }

      let payload;

      try {
        payload = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }

      if (payload.type === "user" && onUserMessage) {
        onUserMessage(payload.message, payload.chat);
      } else if (payload.type === "delta" && onDelta) {
        onDelta(payload.text);
      } else if (payload.type === "done" && onDone) {
        onDone(payload.message, payload.chat);
      } else if (payload.type === "error") {
        if (onError) {
          onError(new Error(payload.message));
        }
      }
    }
  }
};

// ======================================================
// Error messages
// ======================================================

export const getErrorMessage = (error) => {
  if (error?.response) {
    return (
      error.response.data?.message ||
      `Request failed with status ${error.response.status}.`
    );
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (error?.code === "ERR_CANCELED") {
    return "The request was cancelled.";
  }

  if (error?.name === "AbortError") {
    return "Generation was stopped.";
  }

  return `Cannot reach the server at ${API_BASE_URL}. Make sure the backend is running.`;
};

export default API;