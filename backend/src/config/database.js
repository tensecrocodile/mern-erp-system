const fs = require("fs");
const path = require("path");

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const logger = require("../utils/logger");

const embeddedDatabaseState = {
  memoryServer: null,
  source: "external",
  uri: null,
};

const EMBEDDED_DB_PORT = Number(process.env.MONGODB_MEMORY_PORT) || 39017;
const EMBEDDED_DB_NAME = process.env.MONGODB_DB_NAME || "erp_system_demo";
const EMBEDDED_DB_PATH = path.join(process.cwd(), ".demo-mongodb");

function shouldUseEmbeddedMongo() {
  const explicitFlag = process.env.USE_EMBEDDED_MONGO;

  if (explicitFlag === undefined) {
    return !process.env.MONGODB_URI;
  }

  return explicitFlag === "true";
}

function getEmbeddedMongoUri() {
  return `mongodb://127.0.0.1:${EMBEDDED_DB_PORT}/${EMBEDDED_DB_NAME}`;
}

async function startEmbeddedMongoServer() {
  if (embeddedDatabaseState.memoryServer) {
    return embeddedDatabaseState.memoryServer;
  }

  fs.mkdirSync(EMBEDDED_DB_PATH, { recursive: true });

  embeddedDatabaseState.memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: EMBEDDED_DB_NAME,
      dbPath: EMBEDDED_DB_PATH,
      ip: "127.0.0.1",
      port: EMBEDDED_DB_PORT,
    },
  });

  logger.info("Embedded MongoDB server started.", {
    dbName: EMBEDDED_DB_NAME,
    port: EMBEDDED_DB_PORT,
  });

  return embeddedDatabaseState.memoryServer;
}

async function resolveMongoUri() {
  if (process.env.MONGODB_URI) {
    embeddedDatabaseState.source = "external";
    embeddedDatabaseState.uri = process.env.MONGODB_URI;
    return process.env.MONGODB_URI;
  }

  if (!shouldUseEmbeddedMongo()) {
    throw new Error("MONGODB_URI is not configured.");
  }

  const embeddedMongoUri = getEmbeddedMongoUri();

  try {
    const probeConnection = await mongoose.createConnection(embeddedMongoUri, {
      serverSelectionTimeoutMS: 800,
    }).asPromise();

    await probeConnection.close();

    embeddedDatabaseState.source = "embedded";
    embeddedDatabaseState.uri = embeddedMongoUri;
    return embeddedMongoUri;
  } catch (_error) {
    await startEmbeddedMongoServer();
    embeddedDatabaseState.source = "embedded";
    embeddedDatabaseState.uri = embeddedMongoUri;
    return embeddedMongoUri;
  }
}

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  const mongoUri = await resolveMongoUri();

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  logger.info("MongoDB connected.", {
    source: embeddedDatabaseState.source,
    uri: mongoUri,
  });

  return {
    source: embeddedDatabaseState.source,
    uri: mongoUri,
  };
}

async function disconnectDatabase() {
  await mongoose.disconnect();

  if (embeddedDatabaseState.memoryServer) {
    await embeddedDatabaseState.memoryServer.stop();
    embeddedDatabaseState.memoryServer = null;
    logger.info("Embedded MongoDB server stopped.");
  }
}

function getDatabaseInfo() {
  return {
    source: embeddedDatabaseState.source,
    uri: embeddedDatabaseState.uri,
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseInfo,
};
