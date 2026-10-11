// require("dotenv/config");

// const express = require("express");

// const db = require("./db/db.config");

// const mainRouter =
//   require("./src/app/main.route");

// const logger =
//   require("./src/middleware/logger");

// const loggerSecond =
//   require("./src/middleware/logger-second");

// const errorHandler =
//   require("./src/middleware/error-handler");

// const app = express();

// const PORT =
//   process.env.PORT || 3777;

// // ======================================================
// // Global middleware
// // ======================================================

// app.use(express.json());

// app.use(logger);

// app.use(loggerSecond);

// // ======================================================
// // Home
// // ======================================================

// app.get("/", (req, res) => {
//   res.send("GPT Clone API is running");
// });

// // ======================================================
// // About
// // ======================================================

// app.get("/about", (req, res) => {
//   res.send(
//     "GPT Clone API -about - ChatGPT Clone Project"
//   );
// });

// // ======================================================
// // Database test
// // ======================================================

// app.get(
//   "/db-test",
//   async (req, res, next) => {
//     try {
//       const [rows] =
//         await db.execute(
//           "SELECT 1 AS result"
//         );

//       res.status(200).json({
//         success: true,
//         data: rows
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// // ======================================================
// // Gemini test
// // Keep this temporarily for testing
// // ======================================================

// app.get(
//   "/gemini-test",
//   async (req, res, next) => {
//     try {
//       const {
//         geminiClient,
//         geminiModel
//       } = require("./src/utils/gemini");

//       console.log(
//         "Gemini model:",
//         geminiModel
//       );

//       const response =
//         await geminiClient.models.generateContent({
//           model: geminiModel,
//           contents:
//             "Say hello in one sentence."
//         });

//       const answer =
//         typeof response.text === "function"
//           ? response.text()
//           : response.text;

//       res.status(200).json({
//         success: true,
//         model: geminiModel,
//         answer
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// // ======================================================
// // Main API routes
// // ======================================================

// app.use(
//   "/api",
//   mainRouter
// );

// // ======================================================
// // 404 handler
// // ======================================================

// app.use(
//   (req, res) => {
//     res.status(404).json({
//       success: false,
//       message: "Route not found"
//     });
//   }
// );

// // ======================================================
// // Global error handler
// // ======================================================

// app.use(errorHandler);

// // ======================================================
// // Start server
// // ======================================================

// const startServer = async () => {
//   try {
//     const connection =
//       await db.getConnection();

//     console.log(
//       "Database connected successfully"
//     );

//     connection.release();

//     app.listen(
//       PORT,
//       () => {
//         console.log(
//           `Server is running on http://localhost:${PORT}`
//         );
//       }
//     );
//   } catch (error) {
//     console.error(
//       "Database connection failed:",
//       error.message
//     );

//     process.exit(1);
//   }
// };

// startServer();


require("dotenv/config");

const express = require("express");
const cors = require("cors");

const db = require("./db/db.config");

const { migrate } =
  require("./db/migrate");

const mainRouter =
  require("./src/app/main.route");

const logger =
  require("./src/middleware/logger");

const loggerSecond =
  require("./src/middleware/logger-second");

const errorHandler =
  require("./src/middleware/error-handler");

const app = express();

const PORT =
  process.env.PORT || 3777;

// ======================================================
// CORS
// ======================================================

// Comma-separated list of exact origins allowed to
// call the API. Defaults to both Vite development
// ports (5173 and 5174).
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (same-origin,
      // curl, Postman, server-to-server) are allowed.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Disallowed origin: do not throw, simply omit the
      // CORS headers so the browser blocks the response.
      return callback(null, false);
    },
  })
);

// ======================================================
// Middleware
// ======================================================

app.disable("x-powered-by");

app.use(
  express.json({ limit: "1mb" })
);

app.use(logger);

app.use(loggerSecond);

// ======================================================
// Home
// ======================================================

app.get("/", (req, res) => {
  res.send(
    "GPT Clone API is running"
  );
});

// ======================================================
// About
// ======================================================

app.get("/about", (req, res) => {
  res.send(
    "GPT Clone API - ChatGPT Clone Project"
  );
});

// ======================================================
// Database test
// ======================================================

app.get(
  "/db-test",
  async (req, res, next) => {
    try {
      const [rows] =
        await db.execute(
          "SELECT 1 AS result"
        );

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ======================================================
// Gemini test
// ======================================================

app.get(
  "/gemini-test",
  async (req, res, next) => {
    try {
      const {
        geminiClient,
        geminiModel,
      } = require(
        "./src/utils/gemini"
      );

      console.log(
        "Gemini model:",
        geminiModel
      );

      const response =
        await geminiClient.models.generateContent(
          {
            model: geminiModel,
            contents:
              "Say hello in one sentence.",
          }
        );

      const answer =
        typeof response.text ===
        "function"
          ? response.text()
          : response.text;

      res.status(200).json({
        success: true,
        model: geminiModel,
        answer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ======================================================
// API routes
// ======================================================

app.use(
  "/api",
  mainRouter
);

// ======================================================
// 404
// ======================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }
);

// ======================================================
// Error handler
// ======================================================

app.use(errorHandler);

// ======================================================
// Start server
// ======================================================

const startServer = async () => {
  try {
    const connection =
      await db.getConnection();

    console.log(
      "Database connected successfully"
    );

    connection.release();

    await migrate();

    console.log(
      "Database schema is up to date"
    );

    app.listen(
      PORT,
      () => {
        console.log(
          `Server is running on http://localhost:${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Database connection failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();