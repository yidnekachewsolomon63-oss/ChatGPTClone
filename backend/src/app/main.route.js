// const express = require("express");

// const chatRouter = require("../api/chat/chat.route");

// const mainRouter = express.Router();

// mainRouter.use(
//   "/chat",
//   chatRouter
// );

// module.exports = mainRouter;



const express = require("express");

const chatRouter =
  require("../api/chat/chat.route");

const mainRouter =
  express.Router();

mainRouter.use(
  "/chat",
  chatRouter
);

module.exports = mainRouter;