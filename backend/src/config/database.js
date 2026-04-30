const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const logger = require("../utils/logger");

const REPLSET_NAME   = process.env.MONGODB_REPLSET_NAME || "rs0";
const EMBEDDED_PORT  = Number(process.env.MONGODB_MEMORY_PORT) || 39017;
const EMBEDDED_DB    = process.env.MONGODB_DB_NAME || "erp_system_demo";

const state = {
  replSet: null,
  source:  "external",
  uri:     null,
};

function embeddedUri() {
  return `mongodb://127.0.0.1:${EMBEDDED_PORT}/${EMBEDDED_DB}?replicaSet=${REPLSET_NAME}`;
}

async function probeRunning() {
  const probe = mongoose.createConnection(embeddedUri(), {
    serverSelectionTimeoutMS: 1500,
    directConnection: false,
  });
  try {
    await probe.asPromise();
    return true;
  } catch {
    return false;
  } finally {
    await probe.close().catch(() => {});
  }
}

async function startReplSet() {
  if (state.replSet) return;

  state.replSet = await MongoMemoryReplSet.create({
    replSet: {
      name:          REPLSET_NAME,
      count:         1,
      storageEngine: "wiredTiger",
    },
    instanceOpts: [{ port: EMBEDDED_PORT }],
  });

  logger.info("Embedded MongoDB replica set started.", {
    name: REPLSET_NAME,
    port: EMBEDDED_PORT,
  });
}

async function resolveUri() {
  if (process.env.MONGODB_URI) {
    state.source = "external";
    state.uri    = process.env.MONGODB_URI;
    return state.uri;
  }

  const already = await probeRunning();
  if (!already) await startReplSet();

  state.source = "embedded";
  state.uri    = embeddedUri();
  return state.uri;
}

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  const uri = await resolveUri();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    replicaSet: state.source === "embedded" ? REPLSET_NAME : undefined,
  });

  logger.info("MongoDB connected.", { source: state.source, uri });

  return { source: state.source, uri };
}

async function disconnectDatabase() {
  await mongoose.disconnect();

  if (state.replSet) {
    await state.replSet.stop();
    state.replSet = null;
    logger.info("Embedded MongoDB replica set stopped.");
  }
}

function getDatabaseInfo() {
  return { source: state.source, uri: state.uri };
}

module.exports = { connectDatabase, disconnectDatabase, getDatabaseInfo };
