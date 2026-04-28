const attendanceService = require("../services/attendanceService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.checkIn = asyncHandler(async (req, res) => {
  const { attendance } = await attendanceService.checkIn({
    userId: req.user._id,
    payload: req.body,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "Check-in recorded successfully.",
    data: {
      attendance,
    },
  });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const { attendance } = await attendanceService.checkOut({
    userId: req.user._id,
    payload: req.body,
  });

  return sendSuccess(res, {
    message: "Check-out recorded successfully.",
    data: {
      attendance,
    },
  });
});

exports.getLogs = asyncHandler(async (req, res) => {
  const logs = await attendanceService.getLogs({
    userId: req.user._id,
    limit: req.query.limit,
  });

  return sendSuccess(res, {
    message: "Attendance logs retrieved.",
    data: { logs },
  });
});

exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await attendanceService.getSummary({
    userId: req.user._id,
    month: req.query.month,
  });

  return sendSuccess(res, {
    message: "Attendance summary retrieved.",
    data: { summary },
  });
});
