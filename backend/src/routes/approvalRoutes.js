const express = require("express");

const approvalController = require("../controllers/approvalController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);
router.use(authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER));

router.get("/", approvalController.getApprovals);

module.exports = router;
