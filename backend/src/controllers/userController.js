const authService = require("../services/authService");
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

exports.listEmployees = asyncHandler(async (req, res) => {
  const users = await userService.listEmployees({
    requester: req.user,
    role:     req.query.role,
    isActive: req.query.isActive,
  });
  return sendSuccess(res, {
    message: "Employees retrieved.",
    data: { users },
  });
});

exports.createEmployee = asyncHandler(async (req, res) => {
  // Reuse existing register logic (handles role-permission checks + uniqueness)
  const result = await authService.registerUser({
    requester: req.user,
    payload:   req.body,
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Employee created successfully.",
    data: { user: result.user },
  });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const user = await userService.setStatus({
    requesterId: req.user._id,
    targetId:    req.params.id,
    isActive:    req.body.isActive,
  });
  return sendSuccess(res, {
    message: `User ${user.isActive ? "activated" : "deactivated"} successfully.`,
    data: { user },
  });
});
