import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  PanelLeftClose,
} from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar({
  conversations,
  activeChatId,
  isOpen,
  onClose,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const editRef = useRef(null);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? conversations.filter((chat) =>
        chat.title.toLowerCase().includes(trimmedQuery)
      )
    : conversations;

  const startEditing = (chat) => {
    setConfirmId(null);
    setEditingId(chat.id);
    setEditValue(chat.title);
  };

  const commitEdit = (id) => {
    const title = editValue.trim();
    setEditingId(null);

    if (title) {
      onRenameChat(id, title);
    }
  };

  const handleSelect = (id) => {
    onSelectChat(id);
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.backdrop} ${
          isOpen ? styles.backdropOpen : ""
        }`}
        onClick={onClose}
      />

      <aside
        className={`${styles.sidebar} ${
          isOpen ? styles.sidebarOpen : ""
        }`}
      >
        <div className={styles.header}>
          <span className={styles.brand}>ChatGPT</span>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.closeBtn}`}
            onClick={onClose}
            title="Close sidebar"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        <button
          type="button"
          className={styles.newChat}
          onClick={() => {
            onNewChat();
            onClose();
          }}
        >
          <Plus size={18} />
          <span>New chat</span>
        </button>

        <div className={styles.search}>
          <Search size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search chats"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setQuery("")}
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <nav className={styles.list}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>
              {trimmedQuery
                ? "No chats found."
                : "No chats yet."}
            </p>
          ) : (
            filtered.map((chat) => (
              <div
                key={chat.id}
                className={`${styles.row} ${
                  chat.id === activeChatId
                    ? styles.rowActive
                    : ""
                }`}
              >
                {editingId === chat.id ? (
                  <input
                    ref={editRef}
                    className={styles.renameInput}
                    value={editValue}
                    onChange={(event) =>
                      setEditValue(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      } else if (event.key === "Escape") {
                        skipBlurRef.current = true;
                        setEditingId(null);
                      }
                    }}
                    onBlur={() => {
                      if (skipBlurRef.current) {
                        skipBlurRef.current = false;
                        return;
                      }
                      commitEdit(chat.id);
                    }}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.rowMain}
                      onClick={() => handleSelect(chat.id)}
                      title={chat.title}
                    >
                      <MessageSquare size={16} />
                      <span className={styles.rowTitle}>
                        {chat.title}
                      </span>
                    </button>

                    <div className={styles.rowActions}>
                      {confirmId === chat.id ? (
                        <>
                          <button
                            type="button"
                            className={styles.iconBtnSm}
                            onClick={() => {
                              onDeleteChat(chat.id);
                              setConfirmId(null);
                            }}
                            title="Confirm delete"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtnSm}
                            onClick={() => setConfirmId(null)}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.iconBtnSm}
                            onClick={() => startEditing(chat)}
                            title="Rename"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtnSm}
                            onClick={() => {
                              setEditingId(null);
                              setConfirmId(chat.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </nav>

        <div className={styles.footer}>
          <div className={styles.user}>
            <div className={styles.avatar}>IT</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Guest</span>
              <span className={styles.userPlan}>Free plan</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}