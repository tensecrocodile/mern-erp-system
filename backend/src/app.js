const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const { getDatabaseInfo } = require("./config/database");
const { initializeNotificationEventListeners } = require("./listeners/notificationEventListener");
const { requireDatabaseConnection } = require("./middleware/databaseMiddleware");
const { errorHandler, notFoundHandler } = require("./middleware/errorMiddleware");
const apiRoutes = require("./routes");
const logger = require("./utils/logger");
const { sendSuccess } = require("./utils/response");

const app = express();

app.use(helmet());

initializeNotificationEventListeners();

function getDatabaseStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
}

morgan.token("request-body-size", (req) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return "0b";
  }

  return `${Buffer.byteLength(JSON.stringify(req.body), "utf8")}b`;
});

app.use(
  morgan(":method :url :status :response-time ms :request-body-size", {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : process.env.NODE_ENV === "production" ? false : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later.", data: null },
});

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later.", data: null },
});

app.use("/api/v1/auth", authRateLimiter);
app.use("/api/v1", globalRateLimiter);

function sendHealthResponse(_req, res) {
  return sendSuccess(res, {
    message: "Health check successful.",
    data: {
      status: "ok",
      uptime: process.uptime(),
      database: {
        status: getDatabaseStatus(),
        source: getDatabaseInfo().source,
      },
      timestamp: new Date().toISOString(),
    },
  });
}

app.get("/health", sendHealthResponse);
app.get("/api/v1/health", sendHealthResponse);

// Simple health check endpoint + database dependent one for better monitoring
app.get("/", (_req, res) => {
  return sendSuccess(res, {
    message: "ERP Backend Running 🚀",
    data: {
      version: "v1",
      status: "active",
    },
  });
});

// Serve uploaded selfies — requires a valid JWT
const { verifyAccessToken } = require("./utils/jwt");
app.use("/uploads", (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required." });
    verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}, express.static(path.join(process.cwd(), "uploads")));

// API Routes
app.use("/api/v1", requireDatabaseConnection, apiRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
