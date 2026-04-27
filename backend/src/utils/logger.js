function serializeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  try {
    return ` ${JSON.stringify(metadata)}`;
  } catch (_error) {
    return "";
  }
}

function log(level, message, metadata) {
  const timestamp = new Date().toISOString();
  const normalizedLevel = level.toUpperCase();
  const output = `[${timestamp}] [${normalizedLevel}] ${message}${serializeMetadata(metadata)}`;

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

module.exports = {
  error(message, metadata) {
    log("error", message, metadata);
  },
  info(message, metadata) {
    log("info", message, metadata);
  },
  warn(message, metadata) {
    log("warn", message, metadata);
  },
};
