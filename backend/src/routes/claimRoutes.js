const express = require("express");

const claimController = require("../controllers/claimController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateClaimIdParam,
  validateClaimReview,
  validateClaimSubmission,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  authorize(USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER),
  validateClaimSubmission,
  claimController.submitClaim
);

router.get("/me", claimController.getMyClaims);

router.get(
  "/",
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER),
  claimController.getAllClaims
);

// Only manager (pending_manager stage) and hr (pending_hr stage) may review.
// The service layer enforces the stage↔role match and throws 403 if mismatched.
router.patch(
  "/:id/review",
  validateClaimIdParam,
  authorize(USER_ROLES.MANAGER, USER_ROLES.HR),
  validateClaimReview,
  claimController.reviewClaim
);

module.exports = router;
