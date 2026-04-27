const announcementService = require("../services/announcementService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await announcementService.createAnnouncement(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Announcement created successfully.",
    data: { announcement },
  });
});

exports.publishAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await announcementService.publishAnnouncement(req.params.id);
  return sendSuccess(res, {
    message: "Announcement published successfully.",
    data: { announcement },
  });
});

exports.getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await announcementService.getAnnouncements(req.user.role);
  return sendSuccess(res, {
    message: "Announcements fetched successfully.",
    data: { announcements },
  });
});

exports.getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await announcementService.getAnnouncementById(req.params.id);
  return sendSuccess(res, {
    message: "Announcement fetched successfully.",
    data: { announcement },
  });
});

exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await announcementService.updateAnnouncement(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Announcement updated successfully.",
    data: { announcement },
  });
});

exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  await announcementService.deleteAnnouncement(req.params.id);
  return sendSuccess(res, { message: "Announcement deleted successfully." });
});
