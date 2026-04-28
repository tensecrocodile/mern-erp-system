const express = require("express");

const leaveController = require("../controllers/leaveController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateLeaveIdParam,
  validateLeaveReview,
  validateLeaveSubmission,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  authorize(USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER),
  validateLeaveSubmission,
  leaveController.applyLeave
);

router.get("/me", leaveController.getMyLeaves);

router.get(
  "/",
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER),
  leaveController.getAllLeaves
);

// Only manager (pending_manager stage) and hr (pending_hr stage) may review.
router.patch(
  "/:id/review",
  validateLeaveIdParam,
  authorize(USER_ROLES.MANAGER, USER_ROLES.HR),
  validateLeaveReview,
  leaveController.reviewLeave
);

module.exports = router;
