const db = require("./db.config");

// ======================================================
// Additive, idempotent schema migration
// ======================================================
//
// This project originally stored every message in a
// single flat `conversations` table (a legacy single
// thread). We now support multiple ChatGPT-style chats:
//
//   chats     -> one row per conversation
//   messages  -> messages belonging to a chat
//
// The legacy table is NEVER dropped or modified. On the
// very first run (no chats at all) its existing rows are
// copied into one "Imported history" chat so no data is
// lost.

const CREATE_CHATS = `
  CREATE TABLE IF NOT EXISTS chats (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL DEFAULT 'New chat',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_chats_updated_at (updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_MESSAGES = `
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
`;

const tableExists = async (name) => {
  const [rows] = await db.query(
    "SELECT 1 FROM information_schema.tables " +
      "WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [name]
  );

  return rows.length > 0;
};

const countRows = async (table) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM \`${table}\``
  );

  return Number(rows[0].total);
};

const importLegacyHistory = async () => {
  if (!(await tableExists("conversations"))) {
    return;
  }

  const legacyCount = await countRows("conversations");

  if (legacyCount === 0) {
    return;
  }

  const [chatResult] = await db.query(
    "INSERT INTO chats (title) VALUES (?)",
    ["Imported history"]
  );

  const chatId = chatResult.insertId;

  const [result] = await db.query(
    `INSERT INTO messages
       (chat_id, role, content, token_count, created_at)
     SELECT ?, role, content, token_count, created_at
     FROM conversations
     ORDER BY id ASC`,
    [chatId]
  );

  console.log(
    `Migrated ${result.affectedRows} legacy message(s) ` +
      `into chat #${chatId} ("Imported history").`
  );
};

const migrate = async () => {
  await db.query(CREATE_CHATS);
  await db.query(CREATE_MESSAGES);

  // Only perform the one-time legacy import when the
  // application has no chats yet. This keeps the import
  // idempotent across server restarts.
  const chatCount = await countRows("chats");

  if (chatCount === 0) {
    await importLegacyHistory();
  }
};

module.exports = { migrate };
