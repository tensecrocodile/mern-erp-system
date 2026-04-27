const notificationService = require("../services/notificationService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getUserNotifications({
    userId: req.user._id,
  });

  return sendSuccess(res, {
    message: "Notifications fetched successfully.",
    data: {
      notifications,
    },
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead({
    notificationId: req.params.id,
    userId: req.user._id,
  });

  return sendSuccess(res, {
    message: "Notification marked as read.",
    data: {
      notification,
    },
  });
});
