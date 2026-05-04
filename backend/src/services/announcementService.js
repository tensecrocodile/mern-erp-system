const Announcement = require("../models/Announcement");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const notificationService = require("./notificationService");
const { NOTIFICATION_TYPES, WORK_MODES } = require("../utils/constants");
const logger = require("../utils/logger");

async function createAnnouncement(adminUserId, data) {
  const isDraft = data.isDraft === true;
  const publishedAt = isDraft ? null : (data.scheduledFor ? null : new Date());

  const announcement = await Announcement.create({
    title: data.title,
    body: data.body,
    attachmentUrl: data.attachmentUrl || "",
    targetAudience: data.targetAudience || "all",
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
    publishedAt,
    createdBy: adminUserId,
    isDraft,
  });

  if (!isDraft && publishedAt) {
    await notifyUsers(announcement).catch((err) => {
      logger.warn("Failed to send announcement notifications.", { err });
    });
  }

  return announcement.toJSON();
}

async function publishAnnouncement(announcementId) {
  const announcement = await Announcement.findById(announcementId);
  if (!announcement) throw new ApiError(404, "Announcement not found.");
  if (announcement.publishedAt) throw new ApiError(409, "Already published.");

  announcement.publishedAt = new Date();
  announcement.isDraft = false;
  await announcement.save();

  await notifyUsers(announcement).catch((err) => {
    logger.warn({ err }, "Failed to send announcement notifications.");
  });

  return announcement.toJSON();
}

async function notifyUsers(announcement) {
  const query = { isActive: true };
  if (announcement.targetAudience !== "all") {
    query.workMode = announcement.targetAudience;
  }

  const users = await User.find(query).select("_id").lean();
  if (users.length === 0) return;

  const notifications = users.map((u) => ({
    userId: u._id,
    type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    message: `Announcement: ${announcement.title}`,
    metadata: { announcementId: announcement._id },
  }));

  await notificationService.createNotifications({ notifications });
}

async function getAnnouncements(role) {
  const query = {};
  if (role !== "admin" && role !== "hr" && role !== "manager") {
    query.publishedAt = { $ne: null };
    query.isDraft = false;
  }

  const announcements = await Announcement.find(query)
    .populate("createdBy", "fullName")
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();

  return announcements;
}

async function getAnnouncementById(id) {
  const announcement = await Announcement.findById(id)
    .populate("createdBy", "fullName")
    .lean();
  if (!announcement) throw new ApiError(404, "Announcement not found.");
  return announcement;
}

async function updateAnnouncement(id, data) {
  const announcement = await Announcement.findById(id);
  if (!announcement) throw new ApiError(404, "Announcement not found.");
  if (announcement.publishedAt) throw new ApiError(409, "Cannot edit a published announcement.");

  Object.assign(announcement, {
    title: data.title ?? announcement.title,
    body: data.body ?? announcement.body,
    attachmentUrl: data.attachmentUrl ?? announcement.attachmentUrl,
    targetAudience: data.targetAudience ?? announcement.targetAudience,
    scheduledFor: data.scheduledFor !== undefined ? (data.scheduledFor ? new Date(data.scheduledFor) : null) : announcement.scheduledFor,
    isDraft: data.isDraft !== undefined ? data.isDraft : announcement.isDraft,
  });

  await announcement.save();
  return announcement.toJSON();
}

async function deleteAnnouncement(id) {
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) throw new ApiError(404, "Announcement not found.");
  return true;
}

module.exports = {
  createAnnouncement,
  publishAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
};
