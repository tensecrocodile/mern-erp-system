const express = require("express");

const reportController = require("../controllers/reportController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);
router.use(authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER));

router.get("/attendance/export", reportController.exportAttendance);

module.exports = router;
