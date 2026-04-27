function getConfiguredTimeZone() {
  const configuredTimeZone =
    process.env.APP_TIMEZONE || process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: configuredTimeZone });
    return configuredTimeZone;
  } catch (_error) {
    return "UTC";
  }
}

function extractZonedDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const mappedParts = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      mappedParts[part.type] = Number(part.value);
    }
  }

  return {
    year: mappedParts.year,
    month: mappedParts.month,
    day: mappedParts.day,
  };
}

function getTimeZoneOffsetInMilliseconds(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const mappedParts = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      mappedParts[part.type] = Number(part.value);
    }
  }

  const asUtcTimestamp = Date.UTC(
    mappedParts.year,
    mappedParts.month - 1,
    mappedParts.day,
    mappedParts.hour,
    mappedParts.minute,
    mappedParts.second
  );

  return asUtcTimestamp - date.getTime();
}

function getUtcStartOfDay(dateInput, timeZone = getConfiguredTimeZone()) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid date received.");
  }

  const { year, month, day } = extractZonedDateParts(date, timeZone);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetInMilliseconds = getTimeZoneOffsetInMilliseconds(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offsetInMilliseconds);
}

module.exports = {
  getConfiguredTimeZone,
  getUtcStartOfDay,
};
