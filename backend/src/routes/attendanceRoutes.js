const express = require("express");

const attendanceController = require("../controllers/attendanceController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");
const {
  validateCheckIn,
  validateCheckOut,
  validateAttendanceLogs,
  validateAttendanceSummary,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post(
  "/selfie",
  authorize(USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER),
  upload.single("selfie"),
  attendanceController.uploadSelfie
);

router.post("/check-in",  authorize(USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER), validateCheckIn,  attendanceController.checkIn);
router.post("/check-out", authorize(USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER), validateCheckOut, attendanceController.checkOut);

router.get("/logs",    validateAttendanceLogs,    attendanceController.getLogs);
router.get("/summary", validateAttendanceSummary, attendanceController.getSummary);

module.exports = router;
