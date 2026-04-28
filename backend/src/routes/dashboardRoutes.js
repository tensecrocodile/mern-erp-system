const express = require("express");

const dashboardController = require("../controllers/dashboardController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.get("/admin", authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), dashboardController.getAdminDashboard);
router.get("/me", dashboardController.getMyDashboard);

module.exports = router;
