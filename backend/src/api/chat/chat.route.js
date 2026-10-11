const express = require("express");

const {
  listConversationsController,
  createConversationController,
  getMessagesController,
  renameConversationController,
  deleteConversationController,
  streamMessageController
} = require("./controller/chat.controller");

const chatRouter = express.Router();

// List / create conversations
chatRouter.get(
  "/conversations",
  listConversationsController
);

chatRouter.post(
  "/conversations",
  createConversationController
);

// Messages of a specific conversation
chatRouter.get(
  "/conversations/:id/messages",
  getMessagesController
);

// Stream an assistant answer (Server-Sent Events)
chatRouter.post(
  "/conversations/:id/messages/stream",
  streamMessageController
);

// Rename / delete a conversation
chatRouter.patch(
  "/conversations/:id",
  renameConversationController
);

chatRouter.delete(
  "/conversations/:id",
  deleteConversationController
);

module.exports = chatRouter;
