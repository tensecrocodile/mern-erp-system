const express = require("express");

const attendanceController = require("../controllers/attendanceController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateCheckIn,
  validateCheckOut,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);
router.use(authorize(...Object.values(USER_ROLES)));

router.post("/check-in", validateCheckIn, attendanceController.checkIn);
router.post("/check-out", validateCheckOut, attendanceController.checkOut);

module.exports = router;
