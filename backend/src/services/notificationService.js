const Notification = require("../models/Notification");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { NOTIFICATION_TYPES, USER_ROLES } = require("../utils/constants");

function normalizeMessage(message) {
  return typeof message === "string" ? message.trim() : "";
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

async function createNotification({ userId, type, message, metadata = {} }) {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    throw new ApiError(400, "Notification message is required.");
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new ApiError(400, "Notification type is invalid.");
  }

  const notification = await Notification.create({
    userId,
    type,
    message: normalizedMessage,
    metadata: normalizeMetadata(metadata),
  });

  return notification.toJSON();
}

async function createNotifications({ notifications }) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  const documents = notifications.map((notification) => ({
    userId: notification.userId,
    type: notification.type,
    message: normalizeMessage(notification.message),
    metadata: normalizeMetadata(notification.metadata),
  }));

  const createdNotifications = await Notification.insertMany(documents, {
    ordered: false,
  });

  return createdNotifications.map((notification) => notification.toJSON());
}

async function getUserNotifications({ userId }) {
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

  return notifications.map((notification) => notification.toJSON());
}

async function markNotificationAsRead({ notificationId, userId }) {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found.");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  return notification.toJSON();
}

async function createTripIdleNotificationsForAdmins(payload) {
  const adminUsers = await User.find({
    role: USER_ROLES.ADMIN,
    isActive: true,
  }).select("_id");

  if (adminUsers.length === 0) {
    return [];
  }

  const message = `Trip idle alert: user ${payload.userId} was idle for ${payload.durationMinutes} minutes.`;

  return createNotifications({
    notifications: adminUsers.map((adminUser) => ({
      userId: adminUser._id,
      type: NOTIFICATION_TYPES.IDLE,
      message,
      metadata: {
        eventName: payload.eventName,
        tripId: payload.tripId,
        userId: payload.userId,
        idleEventId: payload.idleEventId,
        durationMinutes: payload.durationMinutes,
        radiusMeters: payload.radiusMeters,
        thresholdMinutes: payload.thresholdMinutes,
        startedAt: payload.startedAt,
      },
    })),
  });
}

async function createClaimReviewNotification(payload) {
  const statusLabel = payload.status === "approved" ? "approved" : "rejected";

  return createNotification({
    userId: payload.userId,
    type: NOTIFICATION_TYPES.CLAIM,
    message: `Your ${payload.type} claim for ${payload.amount} has been ${statusLabel}.`,
    metadata: {
      eventName: payload.eventName,
      claimId: payload.claimId,
      status: payload.status,
      type: payload.type,
      amount: payload.amount,
      reviewedBy: payload.reviewedBy,
      reviewComment: payload.reviewComment,
    },
  });
}

async function createLeaveReviewNotification(payload) {
  const statusLabel = payload.status === "approved" ? "approved" : "rejected";

  return createNotification({
    userId: payload.userId,
    type: NOTIFICATION_TYPES.LEAVE,
    message: `Your ${payload.type} leave request has been ${statusLabel}.`,
    metadata: {
      eventName: payload.eventName,
      leaveId: payload.leaveId,
      type: payload.type,
      status: payload.status,
      reviewedBy: payload.reviewedBy,
      reviewComment: payload.reviewComment,
      startDate: payload.startDate,
      endDate: payload.endDate,
    },
  });
}

module.exports = {
  createNotification,
  createNotifications,
  createClaimReviewNotification,
  createLeaveReviewNotification,
  createTripIdleNotificationsForAdmins,
  getUserNotifications,
  markNotificationAsRead,
};
