-- ======================================================
-- GPT Clone database schema
-- ======================================================
-- The application now supports multiple ChatGPT-style
-- conversations. The schema is created automatically and
-- idempotently by `db/migrate.js` on server start, so
-- running this file manually is optional.
-- ======================================================

CREATE DATABASE IF NOT EXISTS `gpt-clone`;

USE `gpt-clone`;

-- ------------------------------------------------------
-- Conversations
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS chats (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL DEFAULT 'New chat',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_chats_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------
-- Messages belonging to a conversation
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS messages (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    chat_id INT UNSIGNED NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content MEDIUMTEXT NOT NULL,
    token_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_messages_chat_id (chat_id, id),
    CONSTRAINT fk_messages_chat
        FOREIGN KEY (chat_id) REFERENCES chats (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------
-- Legacy single-thread table (kept for backward
-- compatibility; never dropped, imported into `messages`
-- on first run).
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role ENUM('user', 'assistant') NOT NULL,
    content MEDIUMTEXT NOT NULL,
    token_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_conversations_created_at (created_at),
    INDEX idx_conversations_id (id)
);
