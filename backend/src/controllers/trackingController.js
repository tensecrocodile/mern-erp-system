const trackingService = require("../services/trackingService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.recordUpdate = asyncHandler(async (req, res) => {
  const log = await trackingService.recordUpdate({
    userId: req.user._id,
    lat: Number(req.body.lat),
    lng: Number(req.body.lng),
    accuracy: Number(req.body.accuracy),
    timestamp: req.body.timestamp,
    deviceId: req.body.deviceId || "",
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "Location update recorded.",
    data: { log },
  });
});

exports.getSessionLogs = asyncHandler(async (req, res) => {
  const { attendanceId } = req.params;
  const logs = await trackingService.getSessionLogs({
    userId: req.user._id,
    attendanceId,
  });

  return sendSuccess(res, {
    message: "Session tracking logs retrieved.",
    data: { logs },
  });
});

exports.getLiveFeed = asyncHandler(async (_req, res) => {
  const logs = await trackingService.getLiveFeed();

  return sendSuccess(res, {
    message: "Live tracking feed retrieved.",
    data: { logs },
  });
});
