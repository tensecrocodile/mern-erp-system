const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { WORK_MODES } = require("../utils/constants");

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

module.exports = { getProfile, updateProfile };
