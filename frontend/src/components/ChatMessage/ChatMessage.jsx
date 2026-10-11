import { useState } from "react";
import { User, Bot, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./ChatMessage.module.css";

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(value);

    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{language}</span>
        <button
          type="button"
          className={styles.codeCopy}
          onClick={handleCopy}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "14px 16px",
          background: "transparent",
          fontSize: "13.5px",
          lineHeight: 1.55,
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ChatMessage({
  role,
  content,
  isStreaming = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    const ok = await copyText(content || "");

    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <div className={`${styles.avatar} ${styles[role]}`}>
        {role === "user" ? (
          <User size={18} />
        ) : (
          <Bot size={18} />
        )}
      </div>

      <div className={styles.content}>
        {role === "user" ? (
          <p className={styles.userText}>{content}</p>
        ) : (
          <>
            <div className={styles.markdownBody}>
              <ReactMarkdown
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code({ className, children }) {
                    const match = /language-(\w+)/.exec(
                      className || ""
                    );
                    const value = String(children).replace(
                      /\n$/,
                      ""
                    );
                    const isBlock =
                      Boolean(match) || value.includes("\n");

                    if (isBlock) {
                      return (
                        <CodeBlock
                          language={match ? match[1] : "text"}
                          value={value}
                        />
                      );
                    }

                    return (
                      <code className={className}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>

              {isStreaming ? (
                <span
                  className={styles.cursor}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {!isStreaming && content ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleCopyMessage}
                  title={copied ? "Copied" : "Copy message"}
                >
                  {copied ? (
                    <Check size={15} />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}