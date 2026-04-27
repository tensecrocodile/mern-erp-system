const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser({
    requester: req.user || null,
    payload: req.body,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "User registered successfully.",
    data: result,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  return sendSuccess(res, {
    message: "Login successful.",
    data: result,
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Profile fetched successfully.",
    data: {
      user: req.user.toJSON(),
    },
  });
});
