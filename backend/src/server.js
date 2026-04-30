require("dotenv").config();

const app = require("./app");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const logger = require("./utils/logger");
const User = require("./models/User");

const port = Number(process.env.PORT) || 5000;
let server;

async function shutdown(exitCode) {
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    logger.error("Database shutdown failed.", {
      message: error.message,
    });
  }

  process.exit(exitCode);
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception.", {
    message: error.message,
    stack: error.stack,
  });
  shutdown(1);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection.", {
    message: error.message,
    stack: error.stack,
  });
  shutdown(1);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down server.");
  shutdown(0);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down server.");
  shutdown(0);
});

async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return;
  logger.info("No users found — running seed.");
  const { runSeed } = require("./scripts/seed");
  await runSeed();
  logger.info("Auto-seed complete.");
}

async function startServer() {
  try {
    await connectDatabase();
    await seedIfEmpty();

    server = app.listen(port, () => {
      logger.info("Server running.", {
        port,
      });
    });
  } catch (error) {
    logger.error("Server startup failed.", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
