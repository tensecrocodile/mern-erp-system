const Attendance = require("../models/Attendance");
const TrackingLog = require("../models/TrackingLog");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { ATTENDANCE_STATUS } = require("../utils/constants");
const { calculateDistanceInMeters } = require("../utils/geo");
const logger = require("../utils/logger");

const SUSPICIOUS_SPEED_KMH = 100;
const SHORT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000; // 5 minutes

function calcSpeedKmh(distanceMeters, elapsedMs) {
  if (elapsedMs <= 0) return null;
  return (distanceMeters / 1000) / (elapsedMs / 3_600_000);
}

async function recordUpdate({ userId, lat, lng, accuracy, timestamp, deviceId = "" }) {
  const eventTime = new Date(timestamp);

  if (Number.isNaN(eventTime.getTime())) {
    throw new ApiError(400, "timestamp must be a valid ISO date.");
  }

  if (eventTime.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) {
    throw new ApiError(400, "timestamp is too far in the future.");
  }

  // Enforce: only allowed when user has an active check-in session
  const activeSession = await Attendance.findOne({
    user: userId,
    status: ATTENDANCE_STATUS.CHECKED_IN,
  }).select("_id checkIn.time").lean();

  if (!activeSession) {
    throw new ApiError(409, "No active attendance session. Check in before sending location updates.");
  }

  const user = await User.findById(userId).select("companyId").lean();

  // Get the most recent log for this session to calculate movement
  const lastLog = await TrackingLog.findOne({
    userId,
    attendanceId: activeSession._id,
  })
    .sort({ timestamp: -1 })
    .select("lat lng timestamp")
    .lean();

  const flags = [];
  let speedKmh = null;
  let distanceFromPreviousMeters = null;

  if (lastLog) {
    distanceFromPreviousMeters = calculateDistanceInMeters(
      { latitude: lastLog.lat, longitude: lastLog.lng },
      { latitude: lat, longitude: lng }
    );

    const elapsedMs = eventTime.getTime() - new Date(lastLog.timestamp).getTime();
    speedKmh = calcSpeedKmh(distanceFromPreviousMeters, elapsedMs);

    if (
      speedKmh !== null &&
      Number.isFinite(speedKmh) &&
      speedKmh > SUSPICIOUS_SPEED_KMH &&
      elapsedMs < SHORT_INTERVAL_MS
    ) {
      flags.push({
        code: "SPEED_ANOMALY",
        detail: `${Math.round(speedKmh)} km/h over ${Math.round(distanceFromPreviousMeters)}m in ${Math.round(elapsedMs / 1000)}s`,
      });
    }
  }

  const isSuspicious = flags.length > 0;

  if (isSuspicious) {
    logger.warn("Suspicious tracking update.", {
      userId: userId.toString(),
      attendanceId: activeSession._id.toString(),
      flags,
    });
  }

  const log = await TrackingLog.create({
    userId,
    companyId: user?.companyId ?? null,
    attendanceId: activeSession._id,
    lat,
    lng,
    accuracy: Math.round(accuracy),
    timestamp: eventTime,
    speedKmh: speedKmh !== null ? Math.round(speedKmh * 100) / 100 : null,
    distanceFromPreviousMeters:
      distanceFromPreviousMeters !== null ? Math.round(distanceFromPreviousMeters) : null,
    deviceId: deviceId.trim().slice(0, 200),
    isSuspicious,
    suspicionFlags: flags,
  });

  logger.info("Tracking update recorded.", {
    userId: userId.toString(),
    attendanceId: activeSession._id.toString(),
    lat,
    lng,
    speedKmh: log.speedKmh,
    isSuspicious,
  });

  return log.toJSON();
}

async function getSessionLogs({ userId, attendanceId }) {
  const logs = await TrackingLog.find({ userId, attendanceId })
    .sort({ timestamp: 1 })
    .lean();
  return logs;
}

async function getLiveFeed() {
  const feed = await TrackingLog.aggregate([
    { $sort: { userId: 1, timestamp: -1 } },
    {
      $group: {
        _id: "$userId",
        lat: { $first: "$lat" },
        lng: { $first: "$lng" },
        accuracy: { $first: "$accuracy" },
        lastUpdatedAt: { $first: "$timestamp" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        userId: "$_id",
        name: "$user.fullName",
        lat: 1,
        lng: 1,
        accuracy: 1,
        lastUpdatedAt: 1,
      },
    },
    { $sort: { lastUpdatedAt: -1 } },
  ]).exec();

  return feed;
}

module.exports = { getSessionLogs, getLiveFeed, recordUpdate };
