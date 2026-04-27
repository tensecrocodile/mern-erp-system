const express = require("express");

const dailyReportController = require("../controllers/dailyReportController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { validateDailyReportSubmission } = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post("/", validateDailyReportSubmission, dailyReportController.submitReport);
router.get("/me", dailyReportController.getMyReports);
router.get("/", authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.HR), dailyReportController.getAllReports);
router.get("/:id", dailyReportController.getReportById);

module.exports = router;
