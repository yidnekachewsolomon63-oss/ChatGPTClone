import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import styles from "./ChatInput.module.css";

export default function ChatInput({ onSend, isLoading, onStop }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(
      element.scrollHeight,
      200
    )}px`;
  }, [input]);

  const submit = () => {
    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    onSend(text);
    setInput("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={styles.container}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          className={styles.input}
          placeholder="Message ChatGPT"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        {isLoading ? (
          <button
            type="button"
            className={styles.submitBtn}
            onClick={onStop}
            title="Stop generating"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!input.trim()}
            title="Send message"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </form>

      <p className={styles.hint}>
        ChatGPT can make mistakes. Check important info.
      </p>
    </div>
  );
}