const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { USER_ROLES, WORK_MODES } = require("../utils/constants");
const logger = require("../utils/logger");

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");
  return user.toJSON();
}

async function updateProfile(userId, data) {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new ApiError(404, "User not found.");
  if (!user.isActive) throw new ApiError(403, "Inactive accounts cannot be updated.");

  if (data.fullName !== undefined) {
    const name = typeof data.fullName === "string" ? data.fullName.trim() : "";
    if (name.length < 2 || name.length > 120) {
      throw new ApiError(400, "Full name must be between 2 and 120 characters.");
    }
    user.fullName = name;
  }

  if (data.workMode !== undefined) {
    if (!Object.values(WORK_MODES).includes(data.workMode)) {
      throw new ApiError(400, `workMode must be one of: ${Object.values(WORK_MODES).join(", ")}.`);
    }
    user.workMode = data.workMode;
  }

  if (data.newPassword !== undefined) {
    if (!data.currentPassword) {
      throw new ApiError(400, "currentPassword is required to change password.");
    }
    if (typeof data.newPassword !== "string" || data.newPassword.length < 8) {
      throw new ApiError(400, "New password must be at least 8 characters.");
    }
    const isMatch = await user.comparePassword(data.currentPassword);
    if (!isMatch) throw new ApiError(400, "Current password is incorrect.");
    user.password = data.newPassword;
  }

  await user.save();
  return user.toJSON();
}

async function listEmployees({ requester, role, isActive }) {
  const query = {};

  // Managers only see their direct reports
  if (requester.role === USER_ROLES.MANAGER) {
    query.managerId = requester._id;
  }

  // Company isolation: when the requester belongs to a company, scope to it
  if (requester.companyId) {
    query.companyId = requester.companyId;
  }

  if (role && Object.values(USER_ROLES).includes(role)) {
    query.role = role;
  }

  if (isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true" || isActive === true;
  }

  const users = await User.find(query)
    .populate("managerId", "fullName email")
    .populate("assignedGeoFences", "name type isActive")
    .sort({ createdAt: -1 })
    .lean();

  return users;
}

async function setStatus({ requesterId, targetId, isActive }) {
  if (String(requesterId) === String(targetId)) {
    throw new ApiError(400, "You cannot change your own active status.");
  }

  const user = await User.findById(targetId);
  if (!user) throw new ApiError(404, "User not found.");

  user.isActive = Boolean(isActive);
  await user.save({ validateBeforeSave: false });

  logger.info(`User ${isActive ? "activated" : "deactivated"}.`, {
    targetId: String(targetId),
    changedBy: String(requesterId),
  });

  return user.toJSON();
}

module.exports = { getProfile, listEmployees, setStatus, updateProfile };
