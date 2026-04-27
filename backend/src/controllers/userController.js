const userService = require("../services/userService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.getMe = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  return sendSuccess(res, {
    message: "Profile fetched successfully.",
    data: { user },
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  return sendSuccess(res, {
    message: "Profile updated successfully.",
    data: { user },
  });
});
