import { Bot } from "lucide-react";
import ChatMessage from "../ChatMessage/ChatMessage";
import styles from "./MessageList.module.css";

const SUGGESTIONS = [
  {
    title: "Explain a concept",
    text: "Explain the difference between let, const, and var in JavaScript.",
  },
  {
    title: "Write some code",
    text: "Write a custom React hook that debounces a value.",
  },
  {
    title: "Help me debug",
    text: "Why does a React useEffect run twice on mount in development?",
  },
  {
    title: "Be creative",
    text: "Write a short poem about learning to code.",
  },
];

export default function MessageList({
  messages,
  isLoading,
  isStreaming,
  streamText,
  messagesEndRef,
  onSuggestion,
}) {
  const isEmpty =
    messages.length === 0 && !isStreaming && !isLoading;

  if (isEmpty) {
    return (
      <div className={styles.messages}>
        <div className={styles.welcome}>
          <div className={styles.welcomeIcon}>
            <Bot size={28} />
          </div>
          <h1 className={styles.welcomeTitle}>
            What are you working on?
          </h1>
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.title}
                type="button"
                className={styles.suggestion}
                onClick={() => onSuggestion(suggestion.text)}
              >
                <span className={styles.suggestionTitle}>
                  {suggestion.title}
                </span>
                <span className={styles.suggestionText}>
                  {suggestion.text}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className={styles.messages}>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          role={message.role}
          content={message.content}
        />
      ))}

      {isLoading && messages.length === 0 ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingAvatar}>
            <Bot size={18} />
          </div>
          <div className={styles.loading}>
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
          </div>
        </div>
      ) : null}

      {isStreaming ? (
        streamText ? (
          <ChatMessage
            key="streaming"
            role="assistant"
            content={streamText}
            isStreaming
          />
        ) : (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingAvatar}>
              <Bot size={18} />
            </div>
            <div className={styles.loading}>
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
            </div>
          </div>
        )
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  );
}