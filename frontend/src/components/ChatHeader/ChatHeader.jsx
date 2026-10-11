import { ChevronDown, Menu, Square } from "lucide-react";
import styles from "./ChatHeader.module.css";

export default function ChatHeader({
  title,
  isStreaming,
  onOpenSidebar,
  onStop,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={onOpenSidebar}
          title="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <span className={styles.title}>{title || "ChatGPT"}</span>
        <ChevronDown size={16} className={styles.chevron} />
      </div>

      <div className={styles.right}>
        {isStreaming ? (
          <button
            type="button"
            className={styles.stopBtn}
            onClick={onStop}
          >
            <Square size={11} fill="currentColor" />
            <span>Stop</span>
          </button>
        ) : null}
        <div className={styles.avatar}>IT</div>
      </div>
    </header>
  );
}