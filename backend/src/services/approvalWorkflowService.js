const mongoose = require("mongoose");

const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { USER_ROLES } = require("../utils/constants");
const logger = require("../utils/logger");

// Maps current status → which role is expected to act
const STAGE_ROLE_MAP = {
  pending_manager: USER_ROLES.MANAGER,
  pending_hr:      USER_ROLES.HR,
};

// Maps (currentStatus, action) → next state
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
 * Core multi-stage approval engine shared by both Claim and Leave.
 *
 * @param {object} opts
 * @param {mongoose.Model} opts.model        - Claim or Leave mongoose model
 * @param {string}         opts.requestId    - Document ObjectId string
 * @param {string}         opts.reviewerId   - Reviewer's User ObjectId string
 * @param {"approve"|"reject"} opts.action
 * @param {string}         [opts.comment]
 * @returns {{ doc, reviewer, previousStatus }}
 */
async function reviewRequest({ model, requestId, reviewerId, action, comment }) {
  if (!["approve", "reject"].includes(action)) {
    throw new ApiError(400, "Action must be 'approve' or 'reject'.");
  }

  const reviewer = await User.findById(reviewerId).select("_id role isActive fullName").lean();
  if (!reviewer || !reviewer.isActive) {
    throw new ApiError(401, "Reviewer is inactive or no longer exists.");
  }

  const doc = await model.findById(requestId);
  if (!doc) {
    throw new ApiError(404, "Request not found.");
  }

  // Idempotency guard — reject double-action
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

  const transition = TRANSITION_MAP[doc.status][action];
  const previousStatus = doc.status;

  // Append audit entry
  doc.approvalHistory.push({
    action:    action === "approve" ? "approved" : "rejected",
    by:        reviewer._id,
    role:      reviewer.role,
    comment:   typeof comment === "string" ? comment.trim().slice(0, 500) : "",
    timestamp: new Date(),
  });

  doc.status       = transition.status;
  doc.currentStage = transition.currentStage;

  // Save — attempt session transaction; fall back gracefully for standalone MongoDB
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await doc.save({ session });
    });
  } catch (txErr) {
    const isStandalone =
      txErr.codeName === "CommandNotSupportedOnStandalone" ||
      /Transaction numbers are only allowed on a replica/i.test(txErr.message || "");

    if (isStandalone) {
      if (session) { await session.endSession().catch(() => {}); session = null; }
      await doc.save();
    } else {
      throw txErr;
    }
  } finally {
    if (session) await session.endSession().catch(() => {});
  }

  logger.info("Approval workflow: request reviewed.", {
    requestId:      doc._id.toString(),
    previousStatus,
    newStatus:      doc.status,
    action,
    reviewerRole:   reviewer.role,
    reviewerId:     reviewer._id.toString(),
  });

  return { doc, reviewer, previousStatus };
}

module.exports = { reviewRequest };
