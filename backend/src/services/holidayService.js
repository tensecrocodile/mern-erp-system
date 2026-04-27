const mongoose = require("mongoose");

const Holiday = require("../models/Holiday");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { HOLIDAY_TYPES } = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");

function normalizeHolidayName(name) {
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    throw new ApiError(400, "Holiday name is required.");
  }

  return normalizedName;
}

function normalizeHolidayDate(dateInput) {
  const parsedDate = new Date(dateInput);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Holiday date must be a valid ISO date.");
  }

  return getUtcStartOfDay(parsedDate);
}

function normalizeHolidayType(type) {
  const normalizedType = type || HOLIDAY_TYPES.COMPANY;

  if (!Object.values(HOLIDAY_TYPES).includes(normalizedType)) {
    throw new ApiError(400, "Holiday type is invalid.");
  }

  return normalizedType;
}

async function normalizeApplicableScope(applicableTo) {
  if (applicableTo === "all") {
    return {
      applicableTo: "all",
      scopeKey: "all",
    };
  }

  if (!Array.isArray(applicableTo) || applicableTo.length === 0) {
    throw new ApiError(400, "applicableTo must be 'all' or a non-empty array of user IDs.");
  }

  const normalizedUserIds = [...new Set(applicableTo.map((userId) => String(userId).trim()))]
    .filter(Boolean)
    .sort();

  const users = await User.find({
    _id: { $in: normalizedUserIds },
  }).select("_id");

  if (users.length !== normalizedUserIds.length) {
    throw new ApiError(400, "One or more users in applicableTo do not exist.");
  }

  return {
    applicableTo: normalizedUserIds.map((userId) => new mongoose.Types.ObjectId(userId)),
    scopeKey: normalizedUserIds.join(","),
  };
}

function buildHolidayFilters(filters = {}) {
  const query = {};

  if (filters.type !== undefined) {
    if (!Object.values(HOLIDAY_TYPES).includes(filters.type)) {
      throw new ApiError(400, "Holiday type filter is invalid.");
    }

    query.type = filters.type;
  }

  if (filters.date !== undefined) {
    const startOfDay = normalizeHolidayDate(filters.date);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    query.date = {
      $gte: startOfDay,
      $lt: endOfDay,
    };
  }

  return query;
}

async function ensureHolidayDoesNotExist({ date, scopeKey }) {
  const existingHoliday = await Holiday.findOne({
    date,
    scopeKey,
  }).select("_id");

  if (existingHoliday) {
    throw new ApiError(409, "A holiday already exists for the same date and scope.");
  }
}

async function createHoliday(adminId, data) {
  const name = normalizeHolidayName(data.name);
  const date = normalizeHolidayDate(data.date);
  const type = normalizeHolidayType(data.type);
  const scope = await normalizeApplicableScope(data.applicableTo);

  await ensureHolidayDoesNotExist({
    date,
    scopeKey: scope.scopeKey,
  });

  try {
    const holiday = await Holiday.create({
      name,
      date,
      type,
      applicableTo: scope.applicableTo,
      scopeKey: scope.scopeKey,
      createdBy: adminId,
    });

    return holiday.toJSON();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "A holiday already exists for the same date and scope.");
    }

    throw error;
  }
}

async function getAllHolidays(filters = {}) {
  const query = buildHolidayFilters(filters);
  const holidays = await Holiday.find(query)
    .populate("createdBy", "fullName email role")
    .sort({ date: 1, createdAt: -1 });

  return holidays.map((holiday) => holiday.toJSON());
}

async function getUserHolidays(userId) {
  const holidays = await Holiday.find({
    $or: [{ applicableTo: "all" }, { applicableTo: userId }],
  }).sort({ date: 1, createdAt: -1 });

  return holidays.map((holiday) => holiday.toJSON());
}

async function deleteHoliday(holidayId) {
  const holiday = await Holiday.findByIdAndDelete(holidayId);

  if (!holiday) {
    throw new ApiError(404, "Holiday not found.");
  }

  return holiday.toJSON();
}

module.exports = {
  createHoliday,
  deleteHoliday,
  getAllHolidays,
  getUserHolidays,
};
