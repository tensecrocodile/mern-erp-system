const express = require("express");

const trackingController = require("../controllers/trackingController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { validateTrackingUpdate, validateAttendanceIdParam } = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post(
  "/update",
  authorize(USER_ROLES.EMPLOYEE),
  validateTrackingUpdate,
  trackingController.recordUpdate
);
router.get(
  "/session/:attendanceId",
  authorize(USER_ROLES.EMPLOYEE),
  validateAttendanceIdParam,
  trackingController.getSessionLogs
);
router.get(
  "/live",
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.HR),
  trackingController.getLiveFeed
);

module.exports = router;
