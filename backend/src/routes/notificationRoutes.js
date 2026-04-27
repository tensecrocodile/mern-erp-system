const express = require("express");

const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const { validateNotificationIdParam } = require("../middleware/validationMiddleware");

const router = express.Router();

router.use(protect);

router.get("/me", notificationController.getMyNotifications);
router.patch("/:id/read", validateNotificationIdParam, notificationController.markAsRead);

module.exports = router;
