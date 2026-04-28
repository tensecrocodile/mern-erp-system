const express = require("express");

const attendanceController = require("../controllers/attendanceController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateCheckIn,
  validateCheckOut,
  validateAttendanceLogs,
  validateAttendanceSummary,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post("/check-in",  authorize(...Object.values(USER_ROLES)), validateCheckIn,  attendanceController.checkIn);
router.post("/check-out", authorize(...Object.values(USER_ROLES)), validateCheckOut, attendanceController.checkOut);

router.get("/logs",    validateAttendanceLogs,    attendanceController.getLogs);
router.get("/summary", validateAttendanceSummary, attendanceController.getSummary);

module.exports = router;
