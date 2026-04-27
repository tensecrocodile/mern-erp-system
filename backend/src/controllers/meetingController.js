const meetingService = require("../services/meetingService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.createMeeting = asyncHandler(async (req, res) => {
  const meeting = await meetingService.createMeeting(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Meeting created successfully.",
    data: { meeting },
  });
});

exports.getMyMeetings = asyncHandler(async (req, res) => {
  const meetings = await meetingService.getMyMeetings(req.user._id);
  return sendSuccess(res, {
    message: "Meetings fetched successfully.",
    data: { meetings },
  });
});

exports.getAllMeetings = asyncHandler(async (req, res) => {
  const meetings = await meetingService.getAllMeetings();
  return sendSuccess(res, {
    message: "All meetings fetched successfully.",
    data: { meetings },
  });
});
