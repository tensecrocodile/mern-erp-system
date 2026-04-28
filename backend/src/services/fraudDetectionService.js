const Attendance = require("../models/Attendance");
const { calculateDistanceInMeters } = require("../utils/geo");
const logger = require("../utils/logger");

const MAX_REALISTIC_SPEED_KMH = 200;
const MIN_COORDINATE_DELTA = 0.00001; // ~1 metre precision floor

function speedKmh(distanceMeters, elapsedMs) {
  if (elapsedMs <= 0) return Infinity;
  return (distanceMeters / 1000) / (elapsedMs / 3_600_000);
}

function isCoordinateClone(loc1, loc2) {
  return (
    Math.abs(loc1.latitude - loc2.latitude) < MIN_COORDINATE_DELTA &&
    Math.abs(loc1.longitude - loc2.longitude) < MIN_COORDINATE_DELTA
  );
}

/**
 * Analyse a check-in attempt and return a list of fraud flags.
 * A non-empty list means the record should be flagged as suspicious.
 */
async function analyseCheckIn(userId, location, eventTime) {
  const flags = [];

  try {
    // 1. GPS accuracy already enforced upstream (< 50m); log a soft flag if it's marginal
    if (location.accuracy > 30) {
      flags.push({ code: "MARGINAL_GPS_ACCURACY", detail: `accuracy=${location.accuracy}m` });
    }

    // 2. Duplicate coordinates vs yesterday's check-in
    const lastAttendance = await Attendance.findOne({ user: userId })
      .sort({ workDate: -1 })
      .select("checkIn.location checkIn.time")
      .lean();

    if (lastAttendance?.checkIn?.location) {
      const prev = lastAttendance.checkIn.location;
      const prevTime = new Date(lastAttendance.checkIn.time);

      if (isCoordinateClone(prev, location)) {
        flags.push({ code: "IDENTICAL_COORDINATES", detail: `repeated lat=${location.latitude},lng=${location.longitude}` });
      }

      // 3. Unrealistic speed from previous check-in point
      const distanceMeters = calculateDistanceInMeters(location, { latitude: prev.latitude, longitude: prev.longitude });
      const elapsedMs = eventTime.getTime() - prevTime.getTime();
      const speed = speedKmh(distanceMeters, elapsedMs);

      if (Number.isFinite(speed) && speed > MAX_REALISTIC_SPEED_KMH && elapsedMs < 3_600_000) {
        flags.push({
          code: "UNREALISTIC_SPEED",
          detail: `${Math.round(speed)} km/h from last known position`,
        });
      }
    }
  } catch (err) {
    logger.warn("Fraud detection error (non-fatal).", { message: err.message });
  }

  return flags;
}

/**
 * Analyse a trip location update for sudden jumps.
 * Returns flags array; caller decides whether to persist or alert.
 */
function analyseTripLocation(prevLocation, newLocation, elapsedMs) {
  const flags = [];

  try {
    if (!prevLocation) return flags;

    const distanceMeters = calculateDistanceInMeters(newLocation, prevLocation);
    const speed = speedKmh(distanceMeters, elapsedMs);

    if (Number.isFinite(speed) && speed > MAX_REALISTIC_SPEED_KMH) {
      flags.push({ code: "LOCATION_JUMP", detail: `${Math.round(speed)} km/h jump detected` });
    }

    if (isCoordinateClone(prevLocation, newLocation)) {
      flags.push({ code: "STATIC_LOCATION", detail: "position unchanged from last update" });
    }
  } catch (err) {
    logger.warn("Trip fraud check error (non-fatal).", { message: err.message });
  }

  return flags;
}

module.exports = { analyseCheckIn, analyseTripLocation };
