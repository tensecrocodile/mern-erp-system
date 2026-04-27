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
