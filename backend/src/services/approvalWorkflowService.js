const mongoose = require("mongoose");

const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { USER_ROLES } = require("../utils/constants");
const logger = require("../utils/logger");

const STAGE_ROLE_MAP = {
  pending_manager: USER_ROLES.MANAGER,
  pending_hr:      USER_ROLES.HR,
};

const TRANSITION_MAP = {
  pending_manager: {
    approve: { status: "pending_hr",  currentStage: "hr"        },
    reject:  { status: "rejected",    currentStage: "completed" },
  },
  pending_hr: {
    approve: { status: "approved",    currentStage: "completed" },
    reject:  { status: "rejected",    currentStage: "completed" },
  },
};

/**
 * Multi-stage approval engine shared by Claim and Leave.
 * Runs inside a MongoDB transaction — requires replica set.
 */
async function reviewRequest({ model, requestId, reviewerId, action, comment }) {
  if (!["approve", "reject"].includes(action)) {
    throw new ApiError(400, "Action must be 'approve' or 'reject'.");
  }

  const reviewer = await User.findById(reviewerId)
    .select("_id role isActive fullName")
    .lean();

  if (!reviewer || !reviewer.isActive) {
    throw new ApiError(401, "Reviewer is inactive or no longer exists.");
  }

  const session = await mongoose.startSession();

  let result;
  try {
    await session.withTransaction(async () => {
      const doc = await model.findById(requestId).session(session);

      if (!doc) {
        throw new ApiError(404, "Request not found.");
      }

      if (doc.status === "approved" || doc.status === "rejected") {
        throw new ApiError(409, "This request has already been finalized.");
      }

      const requiredRole = STAGE_ROLE_MAP[doc.status];
      if (!requiredRole) {
        throw new ApiError(409, "Request is in an unrecognised workflow state.");
      }

      if (reviewer.role !== requiredRole) {
        throw new ApiError(
          403,
          `Only a ${requiredRole} can act on a request in '${doc.status}' status.`
        );
      }

      const requestOwnerId = (doc.userId ?? doc.user)?.toString();
      if (requestOwnerId && requestOwnerId === reviewerId.toString()) {
        throw new ApiError(403, "You cannot approve or reject your own request.");
      }

      const previousStatus = doc.status;
      const transition     = TRANSITION_MAP[doc.status][action];

      doc.approvalHistory.push({
        action:    action === "approve" ? "approved" : "rejected",
        by:        reviewer._id,
        role:      reviewer.role,
        comment:   typeof comment === "string" ? comment.trim().slice(0, 500) : "",
        timestamp: new Date(),
      });

      doc.status       = transition.status;
      doc.currentStage = transition.currentStage;

      await doc.save({ session });

      result = { doc, reviewer, previousStatus };

      logger.info("Approval workflow: request reviewed.", {
        requestId:    doc._id.toString(),
        previousStatus,
        newStatus:    doc.status,
        action,
        reviewerRole: reviewer.role,
        reviewerId:   reviewer._id.toString(),
      });
    });
  } finally {
    await session.endSession();
  }

  return result;
}

module.exports = { reviewRequest };
