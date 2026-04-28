const leaveService = require("../services/leaveService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.applyLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.applyLeave(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Leave applied successfully.",
    data: { leave },
  });
});

exports.getMyLeaves = asyncHandler(async (req, res) => {
  const leaves = await leaveService.getUserLeaves(req.user._id);
  return sendSuccess(res, {
    message: "My leaves fetched successfully.",
    data: { leaves },
  });
});

exports.getAllLeaves = asyncHandler(async (req, res) => {
  const leaves = await leaveService.getAllLeaves(req.user._id, req.user.role, {
    status: req.query.status,
  });
  return sendSuccess(res, {
    message: "Leaves fetched successfully.",
    data: { leaves },
  });
});

exports.reviewLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.reviewLeave(
    req.user._id,
    req.params.id,
    req.body.action,
    req.body.comment
  );
  return sendSuccess(res, {
    message: "Leave reviewed successfully.",
    data: { leave },
  });
});
