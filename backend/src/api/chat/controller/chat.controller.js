const {
  DEFAULT_TITLE,
  MAX_QUESTION_LENGTH,
  deriveTitle,
  listChats,
  getChatById,
  createChat,
  renameChat,
  deleteChat,
  getMessages,
  getContextRows,
  appendMessage,
  streamAssistantAnswer
} = require("../service/chat.service");

// ======================================================
// Helpers
// ======================================================

const parseId = (raw) => {
  const id = Number(raw);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ======================================================
// GET /api/chat/conversations
// ======================================================

const listConversationsController = async (
  req,
  res,
  next
) => {
  try {
    const conversations = await listChats();

    res.status(200).json({
      success: true,
      message: "Conversations fetched successfully.",
      data: { conversations }
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// POST /api/chat/conversations
// ======================================================

const createConversationController = async (
  req,
  res,
  next
) => {
  try {
    const conversation = await createChat(
      req.body?.title
    );

    res.status(201).json({
      success: true,
      message: "Conversation created successfully.",
      data: { conversation }
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET /api/chat/conversations/:id/messages
// ======================================================

const getMessagesController = async (req, res, next) => {
  try {
    const chatId = parseId(req.params.id);

    if (!chatId) {
      throw createError("Invalid conversation id", 400);
    }

    const chat = await getChatById(chatId);

    if (!chat) {
      throw createError("Conversation not found", 404);
    }

    const messages = await getMessages(chatId);

    res.status(200).json({
      success: true,
      message: "Messages fetched successfully.",
      data: { chat, messages }
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// PATCH /api/chat/conversations/:id
// ======================================================

const renameConversationController = async (
  req,
  res,
  next
) => {
  try {
    const chatId = parseId(req.params.id);

    if (!chatId) {
      throw createError("Invalid conversation id", 400);
    }

    const chat = await renameChat(
      chatId,
      req.body?.title
    );

    if (!chat) {
      throw createError("Conversation not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Conversation renamed successfully.",
      data: { conversation: chat }
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// DELETE /api/chat/conversations/:id
// ======================================================

const deleteConversationController = async (
  req,
  res,
  next
) => {
  try {
    const chatId = parseId(req.params.id);

    if (!chatId) {
      throw createError("Invalid conversation id", 400);
    }

    const deleted = await deleteChat(chatId);

    if (!deleted) {
      throw createError("Conversation not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully."
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// POST /api/chat/conversations/:id/messages/stream
// Server-Sent Events stream of the assistant answer.
// ======================================================

const streamMessageController = async (req, res, next) => {
  const chatId = parseId(req.params.id);

  if (!chatId) {
    return next(
      createError("Invalid conversation id", 400)
    );
  }

  const rawContent = req.body?.content;
  const content =
    typeof rawContent === "string"
      ? rawContent.trim()
      : "";

  if (!content) {
    return next(
      createError("content is required", 400)
    );
  }

  if (content.length > MAX_QUESTION_LENGTH) {
    return next(
      createError("content is too long", 400)
    );
  }

  try {
    const chat = await getChatById(chatId);

    if (!chat) {
      return next(
        createError("Conversation not found", 404)
      );
    }

    // History is captured BEFORE the new user message is
    // inserted so it is never duplicated in the prompt.
    const history = await getContextRows(chatId);

    const userMessage = await appendMessage(
      chatId,
      "user",
      content,
      0
    );

    let updatedChat = chat;

    if (chat.title === DEFAULT_TITLE) {
      updatedChat =
        (await renameChat(chatId, deriveTitle(content))) ||
        chat;
    }

    // ----- Server-Sent Events setup -----

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    let clientClosed = false;

    req.on("close", () => {
      clientClosed = true;
    });

    const send = (payload) => {
      if (!clientClosed) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    send({
      type: "user",
      message: userMessage,
      chat: updatedChat
    });

    let assistantText = "";
    let tokenCount = 0;

    try {
      for await (const event of streamAssistantAnswer({
        history,
        question: content
      })) {
        if (clientClosed) {
          break;
        }

        if (event.type === "delta") {
          assistantText += event.text;
          send({ type: "delta", text: event.text });
        } else if (event.type === "usage") {
          tokenCount = event.tokenCount;
        }
      }

      const trimmed = assistantText.trim();

      if (!trimmed) {
        send({
          type: "error",
          message: "The AI returned an empty response."
        });
      } else {
        const assistantMessage = await appendMessage(
          chatId,
          "assistant",
          trimmed,
          tokenCount
        );

        const finalChat =
          (await getChatById(chatId)) || updatedChat;

        send({
          type: "done",
          message: assistantMessage,
          chat: finalChat
        });
      }
    } catch (streamError) {
      console.error("Streaming error:", streamError);
      send({
        type: "error",
        message:
          "The AI provider failed to generate a response. Please try again."
      });
    } finally {
      if (!clientClosed) {
        res.end();
      }
    }
  } catch (error) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "An unexpected error occurred."
          })}\n\n`
        );
        res.end();
      }
    } else {
      next(error);
    }
  }
};

module.exports = {
  listConversationsController,
  createConversationController,
  getMessagesController,
  renameConversationController,
  deleteConversationController,
  streamMessageController
};
