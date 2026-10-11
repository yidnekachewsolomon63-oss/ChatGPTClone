const db = require("../../../../db/db.config");

const {
  geminiClient,
  geminiModel
} = require("../../../utils/gemini");

const SYSTEM_PROMPT = require("../../../utils/system-prompt");

const DEFAULT_TITLE = "New chat";

// Hard caps so the model never receives an unbounded
// amount of conversation history.
const CONTEXT_MESSAGE_LIMIT = 20;
const MAX_HISTORY_MESSAGES = 500;
const MAX_QUESTION_LENGTH = 65535;

// ======================================================
// Helpers
// ======================================================

const clamp = (value, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(Math.trunc(number), max));
};

const normalizeTitle = (title) => {
  if (typeof title !== "string") {
    return "";
  }

  return title.replace(/\s+/g, " ").trim().slice(0, 255);
};

const deriveTitle = (text) => {
  const firstLine = String(text)
    .trim()
    .split(/\r?\n/)[0]
    .trim();

  if (!firstLine) {
    return DEFAULT_TITLE;
  }

  return firstLine.length > 60
    ? `${firstLine.slice(0, 57)}...`
    : firstLine;
};

const formatChat = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const formatMessage = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    content: row.content,
    tokenCount: row.token_count,
    createdAt: row.created_at
  };
};

// ======================================================
// Conversation (chat) CRUD
// ======================================================

const listChats = async () => {
  const [rows] = await db.query(
    `SELECT id, title, created_at, updated_at
     FROM chats
     ORDER BY updated_at DESC, id DESC
     LIMIT 200`
  );

  return rows.map(formatChat);
};

const getChatById = async (id) => {
  const [rows] = await db.execute(
    `SELECT id, title, created_at, updated_at
     FROM chats
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return formatChat(rows[0]);
};

const createChat = async (title) => {
  const cleanTitle =
    normalizeTitle(title) || DEFAULT_TITLE;

  const [result] = await db.execute(
    "INSERT INTO chats (title) VALUES (?)",
    [cleanTitle]
  );

  return getChatById(result.insertId);
};

const renameChat = async (id, title) => {
  const cleanTitle = normalizeTitle(title);

  if (!cleanTitle) {
    const error = new Error("title is required");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await db.execute(
    "UPDATE chats SET title = ? WHERE id = ?",
    [cleanTitle, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getChatById(id);
};

const deleteChat = async (id) => {
  const [result] = await db.execute(
    "DELETE FROM chats WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
};

const touchChat = async (id) => {
  await db.execute(
    "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
};

// ======================================================
// Messages
// ======================================================

const getMessages = async (chatId, limit = MAX_HISTORY_MESSAGES) => {
  const safeLimit = clamp(limit, 1, MAX_HISTORY_MESSAGES);

  const [rows] = await db.execute(
    `SELECT id, chat_id, role, content, token_count, created_at
     FROM (
       SELECT id, chat_id, role, content, token_count, created_at
       FROM messages
       WHERE chat_id = ?
       ORDER BY id DESC
       LIMIT ${safeLimit}
     ) AS recent
     ORDER BY id ASC`,
    [chatId]
  );

  return rows.map(formatMessage);
};

const getContextRows = async (chatId) => {
  const [rows] = await db.execute(
    `SELECT id, role, content
     FROM messages
     WHERE chat_id = ?
     ORDER BY id DESC
     LIMIT ${CONTEXT_MESSAGE_LIMIT}`,
    [chatId]
  );

  return rows.reverse();
};

const appendMessage = async (
  chatId,
  role,
  content,
  tokenCount = 0
) => {
  const [result] = await db.execute(
    `INSERT INTO messages
       (chat_id, role, content, token_count)
     VALUES (?, ?, ?, ?)`,
    [chatId, role, content, tokenCount]
  );

  await touchChat(chatId);

  const [rows] = await db.execute(
    `SELECT id, chat_id, role, content, token_count, created_at
     FROM messages
     WHERE id = ?`,
    [result.insertId]
  );

  return formatMessage(rows[0]);
};

// ======================================================
// Gemini streaming
// ======================================================

const buildContents = (history, question) => {
  const contents = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));

  contents.push({
    role: "user",
    parts: [{ text: question }]
  });

  return contents;
};

// Yields { type: "delta", text } for each chunk and a
// final { type: "usage", tokenCount } when the provider
// reports token usage.
async function* streamAssistantAnswer({ history, question }) {
  const stream =
    await geminiClient.models.generateContentStream({
      model: geminiModel,
      contents: buildContents(history, question),
      config: {
        systemInstruction: SYSTEM_PROMPT
      }
    });

  for await (const chunk of stream) {
    const text = chunk.text;

    if (text) {
      yield { type: "delta", text };
    }

    if (chunk.usageMetadata) {
      yield {
        type: "usage",
        tokenCount:
          chunk.usageMetadata.totalTokenCount || 0
      };
    }
  }
}

module.exports = {
  DEFAULT_TITLE,
  MAX_QUESTION_LENGTH,
  clamp,
  normalizeTitle,
  deriveTitle,
  formatChat,
  formatMessage,
  listChats,
  getChatById,
  createChat,
  renameChat,
  deleteChat,
  getMessages,
  getContextRows,
  appendMessage,
  streamAssistantAnswer
};
