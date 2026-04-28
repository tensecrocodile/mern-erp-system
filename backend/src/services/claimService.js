const Claim = require("../models/Claim");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { CLAIM_STATUS, CLAIM_TYPES, USER_ROLES } = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");
const { reviewRequest } = require("./approvalWorkflowService");
const {
  emitClaimSubmitted,
  emitClaimStageProgressed,
  emitClaimReviewed,
} = require("./claimEventService");
const logger = require("../utils/logger");

// ── Normalisation helpers ──────────────────────────────────────

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments.map((a) => {
    const s = typeof a === "string" ? a.trim() : "";
    if (!s || !isValidHttpUrl(s)) throw new ApiError(400, "Each attachment must be a valid HTTP/HTTPS URL.");
    return s;
  });
}

function normalizeClaimDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "Claim date must be a valid ISO date.");
  return getUtcStartOfDay(d);
}

function normalizeDescription(description) {
  const s = typeof description === "string" ? description.trim() : "";
  if (!s) throw new ApiError(400, "Claim description is required.");
  return s;
}

function normalizeAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new ApiError(400, "Claim amount must be a positive number.");
  return Number(n.toFixed(2));
}

function normalizeClaimType(type) {
  if (!Object.values(CLAIM_TYPES).includes(type)) throw new ApiError(400, "Claim type is invalid.");
  return type;
}

function buildClaimQueryFilters(filters = {}) {
  const query = {};
  if (filters.status !== undefined) {
    if (!Object.values(CLAIM_STATUS).includes(filters.status))
      throw new ApiError(400, "Claim status filter is invalid.");
    query.status = filters.status;
  }
  if (filters.date !== undefined) {
    const start = normalizeClaimDate(filters.date);
    query.date = { $gte: start, $lt: new Date(start.getTime() + 86400000) };
  }
  return query;
}

async function getTeamUserIds(managerId) {
  return User.find({ managerId }).distinct("_id");
}

// ── Public API ─────────────────────────────────────────────────

async function createClaim(userId, data) {
  const claim = await Claim.create({
    userId,
    type:        normalizeClaimType(data.type),
    amount:      normalizeAmount(data.amount),
    date:        normalizeClaimDate(data.date),
    description: normalizeDescription(data.description),
    attachments: normalizeAttachments(data.attachments),
    status:        CLAIM_STATUS.PENDING_MANAGER,
    currentStage:  "manager",
    approvalHistory: [],
  });

  emitClaimSubmitted({
    eventName: "claim.submitted",
    claimId:   claim._id.toString(),
    userId:    claim.userId.toString(),
    type:      claim.type,
    amount:    claim.amount,
  });

  logger.info("Claim submitted.", {
    claimId: claim._id.toString(),
    userId:  claim.userId.toString(),
    type:    claim.type,
    amount:  claim.amount,
  });

  return claim.toJSON();
}

async function getUserClaims(userId) {
  const claims = await Claim.find({ userId })
    .populate("approvalHistory.by", "fullName role")
    .sort({ createdAt: -1 });
  return claims.map((c) => c.toJSON());
}

async function getAllClaims(requesterId, requesterRole, filters = {}) {
  const query = buildClaimQueryFilters(filters);

  if (requesterRole === USER_ROLES.MANAGER) {
    const teamUserIds = await getTeamUserIds(requesterId);
    query.userId = { $in: teamUserIds };
  }

  const claims = await Claim.find(query)
    .populate("userId", "fullName email employeeId role")
    .populate("approvalHistory.by", "fullName role")
    .sort({ createdAt: -1 });

  return claims.map((c) => c.toJSON());
}

async function reviewClaim(reviewerId, claimId, action, comment) {
  const { doc: claim, reviewer, previousStatus } = await reviewRequest({
    model:      Claim,
    requestId:  claimId,
    reviewerId,
    action,
    comment,
  });

  const isFinalized = claim.status === CLAIM_STATUS.APPROVED || claim.status === CLAIM_STATUS.REJECTED;

  if (isFinalized) {
    emitClaimReviewed({
      eventName:     "claim.reviewed",
      claimId:       claim._id.toString(),
      userId:        claim.userId.toString(),
      status:        claim.status,
      type:          claim.type,
      amount:        claim.amount,
      reviewedBy:    reviewer._id.toString(),
      reviewComment: typeof comment === "string" ? comment.trim() : "",
    });
  } else {
    // Manager approved → now pending HR
    emitClaimStageProgressed({
      eventName:    "claim.stage.progressed",
      claimId:      claim._id.toString(),
      userId:       claim.userId.toString(),
      status:       claim.status,
      previousStatus,
      type:         claim.type,
      amount:       claim.amount,
      progressedBy: reviewer._id.toString(),
    });
  }

  return claim.toJSON();
}

module.exports = { createClaim, getAllClaims, getUserClaims, reviewClaim };
