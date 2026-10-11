import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";
import {
  listConversations,
  createConversation,
  getConversationMessages,
  renameConversation,
  deleteConversation,
  streamMessage,
  getErrorMessage,
} from "./api/chatApi";
import "./App.css";

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const loadTokenRef = useRef(0);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, streamText, isLoadingMessages]);

  const abortStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const chats = await listConversations();
      setConversations(chats);
      return chats;
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openChat = useCallback(
    async (chatId) => {
      abortStream();
      setIsStreaming(false);
      setStreamText("");
      setActiveChatId(chatId);
      setMessages([]);
      setIsLoadingMessages(true);
      setError("");

      const token = loadTokenRef.current + 1;
      loadTokenRef.current = token;

      try {
        const { chat, messages: loaded } =
          await getConversationMessages(chatId);

        if (loadTokenRef.current !== token) {
          return;
        }

        setMessages(loaded);

        if (chat) {
          setConversations((prev) =>
            prev.map((item) =>
              item.id === chat.id ? chat : item
            )
          );
        }
      } catch (err) {
        if (loadTokenRef.current === token) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (loadTokenRef.current === token) {
          setIsLoadingMessages(false);
        }
      }
    },
    [abortStream]
  );

  const handleNewChat = useCallback(async () => {
    abortStream();
    setIsStreaming(false);
    setStreamText("");
    setError("");

    try {
      const chat = await createConversation();
      setConversations((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
      setMessages([]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [abortStream]);

  const handleSend = useCallback(
    async (content) => {
      if (!content.trim() || isStreaming) {
        return;
      }

      setError("");

      let chatId = activeChatIdRef.current;

      try {
        if (!chatId) {
          const chat = await createConversation();
          chatId = chat.id;
          setConversations((prev) => [chat, ...prev]);
          setActiveChatId(chatId);
          setMessages([]);
        }
      } catch (err) {
        setError(getErrorMessage(err));
        return;
      }

      const tempId = `temp-user-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          chatId,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamText("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamMessage({
          chatId,
          content,
          signal: controller.signal,
          onUserMessage: (message, chat) => {
            setMessages((prev) =>
              prev.map((item) =>
                item.id === tempId ? message : item
              )
            );

            if (chat) {
              setConversations((prev) =>
                prev.map((item) =>
                  item.id === chat.id ? chat : item
                )
              );
            }
          },
          onDelta: (text) => {
            setStreamText((prev) => prev + text);
          },
          onDone: (message, chat) => {
            setMessages((prev) => [...prev, message]);
            setStreamText("");

            if (chat) {
              setConversations((prev) =>
                prev.map((item) =>
                  item.id === chat.id ? chat : item
                )
              );
            }
          },
          onError: (streamError) => {
            setError(streamError.message);
          },
        });
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(getErrorMessage(err));
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }

        setIsStreaming(false);
        setStreamText("");
      }
    },
    [isStreaming]
  );

  const handleStop = useCallback(() => {
    abortStream();
    setIsStreaming(false);
  }, [abortStream]);

  const handleRenameChat = useCallback(
    async (chatId, title) => {
      try {
        const chat = await renameConversation(chatId, title);
        setConversations((prev) =>
          prev.map((item) =>
            item.id === chat.id ? chat : item
          )
        );
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    []
  );

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await deleteConversation(chatId);
      setConversations((prev) =>
        prev.filter((item) => item.id !== chatId)
      );

      if (activeChatIdRef.current === chatId) {
        abortStream();
        setActiveChatId(null);
        setMessages([]);
        setIsStreaming(false);
        setStreamText("");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [abortStream]);

  const activeChat =
    conversations.find((chat) => chat.id === activeChatId) ||
    null;

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeChatId={activeChatId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectChat={openChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="chat">
        <ChatHeader
          title={activeChat?.title}
          isStreaming={isStreaming}
          onOpenSidebar={() => setSidebarOpen(true)}
          onStop={handleStop}
        />

        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <div className="error-banner__actions">
              <button
                type="button"
                className="error-banner__retry"
                onClick={() => {
                  setError("");
                  loadConversations();
                }}
              >
                Retry
              </button>
              <button
                type="button"
                className="error-banner__dismiss"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <MessageList
          messages={messages}
          isLoading={isLoadingMessages}
          isStreaming={isStreaming}
          streamText={streamText}
          messagesEndRef={messagesEndRef}
          onSuggestion={handleSend}
        />

        <ChatInput
          onSend={handleSend}
          isLoading={isStreaming}
          onStop={handleStop}
        />
      </main>
    </div>
  );
}

export default App;