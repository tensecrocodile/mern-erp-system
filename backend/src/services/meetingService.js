const Meeting = require("../models/Meeting");
const ApiError = require("../utils/apiError");
const { reverseGeocode } = require("./mapplsService");
const logger = require("../utils/logger");

function normalizeRequired(value, field, max) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new ApiError(400, `${field} is required.`);
  if (s.length > max) throw new ApiError(400, `${field} must be at most ${max} characters.`);
  return s;
}

function normalizeOptional(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseLocation(raw) {
  if (!raw || typeof raw !== "object") throw new ApiError(400, "location is required.");
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ApiError(400, "location.lat must be a number between -90 and 90.");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, "location.lng must be a number between -180 and 180.");
  }
  return { lat, lng, address: "" };
}

async function enrichAddress(loc) {
  try {
    const geo = await reverseGeocode(loc.lat, loc.lng);
    if (geo?.formattedAddress) {
      loc.address = geo.formattedAddress.slice(0, 250);
    }
  } catch (err) {
    logger.warn("Reverse geocode failed for meeting.", { message: err.message });
  }
}

async function createMeeting(userId, data) {
  const location = parseLocation(data.location);
  await enrichAddress(location);

  let nextActionDate = null;
  if (data.nextActionDate) {
    const d = new Date(data.nextActionDate);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, "nextActionDate must be a valid ISO date.");
    nextActionDate = d;
  }

  const meeting = await Meeting.create({
    userId,
    clientName: normalizeRequired(data.clientName, "clientName", 120),
    purpose: normalizeRequired(data.purpose, "purpose", 500),
    notes: normalizeOptional(data.notes, 1000),
    outcome: normalizeOptional(data.outcome, 1000),
    nextActionDate,
    location,
    tripId: data.tripId || null,
  });

  logger.info("Meeting created.", {
    meetingId: meeting._id.toString(),
    userId: userId.toString(),
  });

  return meeting.toJSON();
}

async function getMyMeetings(userId) {
  const meetings = await Meeting.find({ userId }).sort({ createdAt: -1 });
  return meetings.map((m) => m.toJSON());
}

async function getAllMeetings() {
  const meetings = await Meeting.find()
    .populate("userId", "fullName email employeeId")
    .sort({ createdAt: -1 });
  return meetings.map((m) => m.toJSON());
}

module.exports = { createMeeting, getAllMeetings, getMyMeetings };
