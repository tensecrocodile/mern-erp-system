const Notification = require("../models/Notification");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { NOTIFICATION_TYPES, USER_ROLES } = require("../utils/constants");

function normalizeMessage(message) {
  return typeof message === "string" ? message.trim() : "";
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata;
}

// ── Core primitives ────────────────────────────────────────────

async function createNotification({ userId, type, message, metadata = {} }) {
  const msg = normalizeMessage(message);
  if (!msg) throw new ApiError(400, "Notification message is required.");
  if (!Object.values(NOTIFICATION_TYPES).includes(type))
    throw new ApiError(400, "Notification type is invalid.");

  const notification = await Notification.create({
    userId,
    type,
    message: msg,
    metadata: normalizeMetadata(metadata),
  });
  return notification.toJSON();
}

async function createNotifications({ notifications }) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const docs = notifications.map((n) => ({
    userId:   n.userId,
    type:     n.type,
    message:  normalizeMessage(n.message),
    metadata: normalizeMetadata(n.metadata),
  }));

  const created = await Notification.insertMany(docs, { ordered: false });
  return created.map((n) => n.toJSON());
}

async function getUserNotifications({ userId }) {
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  return notifications.map((n) => n.toJSON());
}

async function markNotificationAsRead({ notificationId, userId }) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) throw new ApiError(404, "Notification not found.");
  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }
  return notification.toJSON();
}

// ── Internal helpers ───────────────────────────────────────────

async function findUserIdsByRole(role) {
  const users = await User.find({ role, isActive: true }).select("_id").lean();
  return users.map((u) => u._id);
}

async function findManagerOfUser(userId) {
  const user = await User.findById(userId).select("managerId").lean();
  if (!user?.managerId) return null;
  const manager = await User.findOne({ _id: user.managerId, isActive: true }).select("_id").lean();
  return manager?._id ?? null;
}

// ── Trip notifications ─────────────────────────────────────────

async function createTripIdleNotificationsForAdmins(payload) {
  const adminUsers = await User.find({ role: USER_ROLES.ADMIN, isActive: true }).select("_id");
  if (adminUsers.length === 0) return [];

  const message = `Trip idle alert: user ${payload.userId} was idle for ${payload.durationMinutes} minutes.`;
  return createNotifications({
    notifications: adminUsers.map((u) => ({
      userId:   u._id,
      type:     NOTIFICATION_TYPES.IDLE,
      message,
      metadata: {
        eventName:        payload.eventName,
        tripId:           payload.tripId,
        userId:           payload.userId,
        idleEventId:      payload.idleEventId,
        durationMinutes:  payload.durationMinutes,
        radiusMeters:     payload.radiusMeters,
        thresholdMinutes: payload.thresholdMinutes,
        startedAt:        payload.startedAt,
      },
    })),
  });
}

// ── Claim notifications ────────────────────────────────────────

async function createClaimSubmittedNotification(payload) {
  const managerId = await findManagerOfUser(payload.userId);
  if (!managerId) return null;

  return createNotification({
    userId:  managerId,
    type:    NOTIFICATION_TYPES.CLAIM,
    message: `New ${payload.type} claim for ₹${payload.amount} is awaiting your review.`,
    metadata: {
      eventName: payload.eventName,
      claimId:   payload.claimId,
      userId:    payload.userId,
      type:      payload.type,
      amount:    payload.amount,
    },
  });
}

async function createClaimStageProgressedNotification(payload) {
  const hrUserIds = await findUserIdsByRole(USER_ROLES.HR);
  if (hrUserIds.length === 0) return [];

  return createNotifications({
    notifications: hrUserIds.map((id) => ({
      userId:  id,
      type:    NOTIFICATION_TYPES.CLAIM,
      message: `A ${payload.type} claim for ₹${payload.amount} is awaiting HR review.`,
      metadata: {
        eventName: payload.eventName,
        claimId:   payload.claimId,
        userId:    payload.userId,
        type:      payload.type,
        amount:    payload.amount,
      },
    })),
  });
}

async function createClaimReviewNotification(payload) {
  const label = payload.status === "approved" ? "approved ✓" : "rejected ✗";
  return createNotification({
    userId:  payload.userId,
    type:    NOTIFICATION_TYPES.CLAIM,
    message: `Your ${payload.type} claim for ₹${payload.amount} has been ${label}.`,
    metadata: {
      eventName:     payload.eventName,
      claimId:       payload.claimId,
      status:        payload.status,
      type:          payload.type,
      amount:        payload.amount,
      reviewedBy:    payload.reviewedBy,
      reviewComment: payload.reviewComment,
    },
  });
}

// ── Leave notifications ────────────────────────────────────────

async function createLeaveSubmittedNotification(payload) {
  const managerId = await findManagerOfUser(payload.userId);
  if (!managerId) return null;

  return createNotification({
    userId:  managerId,
    type:    NOTIFICATION_TYPES.LEAVE,
    message: `New ${payload.type} leave request is awaiting your review.`,
    metadata: {
      eventName: payload.eventName,
      leaveId:   payload.leaveId,
      userId:    payload.userId,
      type:      payload.type,
      startDate: payload.startDate,
      endDate:   payload.endDate,
    },
  });
}

async function createLeaveStageProgressedNotification(payload) {
  const hrUserIds = await findUserIdsByRole(USER_ROLES.HR);
  if (hrUserIds.length === 0) return [];

  return createNotifications({
    notifications: hrUserIds.map((id) => ({
      userId:  id,
      type:    NOTIFICATION_TYPES.LEAVE,
      message: `A ${payload.type} leave request is awaiting HR review.`,
      metadata: {
        eventName: payload.eventName,
        leaveId:   payload.leaveId,
        userId:    payload.userId,
        type:      payload.type,
        startDate: payload.startDate,
        endDate:   payload.endDate,
      },
    })),
  });
}

async function createLeaveReviewNotification(payload) {
  const label = payload.status === "approved" ? "approved ✓" : "rejected ✗";
  return createNotification({
    userId:  payload.userId,
    type:    NOTIFICATION_TYPES.LEAVE,
    message: `Your ${payload.type} leave request has been ${label}.`,
    metadata: {
      eventName:     payload.eventName,
      leaveId:       payload.leaveId,
      type:          payload.type,
      status:        payload.status,
      reviewedBy:    payload.reviewedBy,
      reviewComment: payload.reviewComment,
      startDate:     payload.startDate,
      endDate:       payload.endDate,
    },
  });
}

module.exports = {
  createNotification,
  createNotifications,
  createClaimSubmittedNotification,
  createClaimStageProgressedNotification,
  createClaimReviewNotification,
  createLeaveSubmittedNotification,
  createLeaveStageProgressedNotification,
  createLeaveReviewNotification,
  createTripIdleNotificationsForAdmins,
  getUserNotifications,
  markNotificationAsRead,
};
