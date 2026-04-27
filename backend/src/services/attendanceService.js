const Attendance = require("../models/Attendance");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { ATTENDANCE_STATUS } = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");
const { validateCheckInAgainstGeoFences } = require("./geoFenceService");
const { reverseGeocode } = require("./mapplsService");
const logger = require("../utils/logger");

const MAX_GPS_ACCURACY_IN_METERS = 50;
const DEFAULT_FULL_DAY_MINUTES = 8 * 60;

function getFullDayThresholdInMinutes() {
  const configuredValue = Number(process.env.FULL_DAY_MINUTES);

  if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
    return DEFAULT_FULL_DAY_MINUTES;
  }

  return Math.round(configuredValue);
}

async function ensureActiveUser(userId) {
  const user = await User.findById(userId).select("_id isActive workMode assignedGeoFences");

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Inactive users cannot record attendance.");
  }

  return user;
}

function parseEventTime(value, fieldName) {
  const parsedTime = value ? new Date(value) : new Date();

  if (Number.isNaN(parsedTime.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date.`);
  }

  return parsedTime;
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new ApiError(400, "Location payload is required.");
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ApiError(400, "Latitude must be a valid number between -90 and 90.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Longitude must be a valid number between -180 and 180.");
  }

  if (!Number.isFinite(accuracy) || accuracy < 0) {
    throw new ApiError(400, "GPS accuracy is required and must be a non-negative number.");
  }

  if (accuracy > MAX_GPS_ACCURACY_IN_METERS) {
    throw new ApiError(
      400,
      `GPS accuracy must be ${MAX_GPS_ACCURACY_IN_METERS} meters or better for attendance actions.`,
      [
        {
          field: "location.accuracy",
          message: `Received ${Math.round(accuracy)} meters.`,
        },
      ]
    );
  }

  return {
    latitude,
    longitude,
    accuracy: Math.round(accuracy),
    address: typeof location.address === "string" ? location.address.trim() : "",
  };
}

function normalizeAttendanceEventPayload(payload, options) {
  const selfieUrl = typeof payload.selfieUrl === "string" ? payload.selfieUrl.trim() : "";

  if (!selfieUrl) {
    throw new ApiError(400, "selfieUrl is required.");
  }

  try {
    const parsedUrl = new URL(selfieUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch (_error) {
    throw new ApiError(400, "selfieUrl must be a valid HTTP or HTTPS URL.");
  }

  return {
    time: parseEventTime(payload[options.timeField], options.timeField),
    location: normalizeLocation(payload.location),
    selfieUrl,
  };
}

function resolveAttendanceStatus(workingMinutes) {
  return workingMinutes >= getFullDayThresholdInMinutes()
    ? ATTENDANCE_STATUS.FULL_DAY
    : ATTENDANCE_STATUS.HALF_DAY;
}

function calculateWorkingMinutes(checkInTime, checkOutTime) {
  return Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
}

function buildAttendanceEvent({ time, location, selfieUrl, matchedGeoFence = null }) {
  return {
    time,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      address: location.address,
    },
    selfieUrl,
    matchedGeoFence,
  };
}

async function enrichLocationWithAddress(location) {
  try {
    const locationData = await reverseGeocode(location.latitude, location.longitude);
    if (locationData?.formattedAddress) {
      location.address = locationData.formattedAddress.slice(0, 250);
    }
  } catch (mapplsError) {
    logger.warn("Reverse geocode failed. Storing raw coordinates.", {
      message: mapplsError.message,
    });
  }
}

async function findOpenAttendance(userId) {
  return Attendance.findOne({
    user: userId,
    status: ATTENDANCE_STATUS.CHECKED_IN,
  }).sort({ "checkIn.time": -1 });
}

async function checkIn({ userId, payload }) {
  const user = await ensureActiveUser(userId);
  const event = normalizeAttendanceEventPayload(payload, {
    timeField: "checkInAt",
  });

  const openAttendance = await findOpenAttendance(userId);

  if (openAttendance) {
    throw new ApiError(409, "You already have an active attendance session. Please check out first.");
  }

  const workDate = getUtcStartOfDay(event.time);

  const existingAttendance = await Attendance.findOne({
    user: userId,
    workDate,
  });

  if (existingAttendance) {
    throw new ApiError(409, "Attendance has already been recorded for this date.");
  }

  const matchedGeoFence = await validateCheckInAgainstGeoFences(user, event.location);

  await enrichLocationWithAddress(event.location);

  const attendance = await Attendance.create({
    user: userId,
    workDate,
    checkIn: buildAttendanceEvent({
      time: event.time,
      location: event.location,
      selfieUrl: event.selfieUrl,
      matchedGeoFence,
    }),
    status: ATTENDANCE_STATUS.CHECKED_IN,
  });

  logger.info("Check-in recorded.", {
    userId: userId.toString(),
    attendanceId: attendance._id.toString(),
    workDate: workDate.toISOString(),
    address: attendance.checkIn.location.address || "—",
  });

  return {
    attendance: attendance.toJSON(),
  };
}

async function checkOut({ userId, payload }) {
  await ensureActiveUser(userId);
  const event = normalizeAttendanceEventPayload(payload, {
    timeField: "checkOutAt",
  });

  const attendance = await findOpenAttendance(userId);

  if (!attendance) {
    throw new ApiError(400, "Cannot check out before checking in.");
  }

  if (event.time < attendance.checkIn.time) {
    throw new ApiError(400, "Check-out time cannot be earlier than check-in time.");
  }

  const workingMinutes = calculateWorkingMinutes(attendance.checkIn.time, event.time);

  await enrichLocationWithAddress(event.location);

  attendance.checkOut = buildAttendanceEvent({
    time: event.time,
    location: event.location,
    selfieUrl: event.selfieUrl,
  });
  attendance.status = resolveAttendanceStatus(workingMinutes);
  attendance.workingMinutes = workingMinutes;

  await attendance.save();

  logger.info("Check-out recorded.", {
    userId: userId.toString(),
    attendanceId: attendance._id.toString(),
    workingMinutes: attendance.workingMinutes,
    status: attendance.status,
  });

  return {
    attendance: attendance.toJSON(),
  };
}

module.exports = {
  checkIn,
  checkOut,
};
