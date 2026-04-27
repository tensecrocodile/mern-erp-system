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

router.post("/", validateClaimSubmission, claimController.submitClaim);
router.get("/me", claimController.getMyClaims);
router.get("/", authorize(USER_ROLES.ADMIN), claimController.getAllClaims);
router.patch(
  "/:id/review",
  validateClaimIdParam,
  authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  validateClaimReview,
  claimController.reviewClaim
);

module.exports = router;
