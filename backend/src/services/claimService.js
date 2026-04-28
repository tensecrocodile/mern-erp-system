const Claim = require("../models/Claim");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { CLAIM_STATUS, CLAIM_TYPES, USER_ROLES } = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");
const { emitClaimReviewed } = require("./claimEventService");
const logger = require("../utils/logger");

function isValidHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch (_error) {
    return false;
  }
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map((attachment) => {
    const normalizedAttachment = typeof attachment === "string" ? attachment.trim() : "";

    if (!normalizedAttachment || !isValidHttpUrl(normalizedAttachment)) {
      throw new ApiError(400, "Each attachment must be a valid HTTP or HTTPS URL.");
    }

    return normalizedAttachment;
  });
}

function normalizeClaimDate(dateInput) {
  const parsedDate = dateInput ? new Date(dateInput) : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Claim date must be a valid ISO date.");
  }

  return getUtcStartOfDay(parsedDate);
}

function normalizeDescription(description) {
  const normalizedDescription = typeof description === "string" ? description.trim() : "";

  if (!normalizedDescription) {
    throw new ApiError(400, "Claim description is required.");
  }

  return normalizedDescription;
}

function normalizeAmount(amount) {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new ApiError(400, "Claim amount must be a positive number.");
  }

  return Number(normalizedAmount.toFixed(2));
}

function normalizeClaimType(type) {
  if (!Object.values(CLAIM_TYPES).includes(type)) {
    throw new ApiError(400, "Claim type is invalid.");
  }

  return type;
}

function normalizeReviewComment(comment) {
  return typeof comment === "string" ? comment.trim() : "";
}

function buildClaimQueryFilters(filters = {}) {
  const query = {};

  if (filters.status !== undefined) {
    if (!Object.values(CLAIM_STATUS).includes(filters.status)) {
      throw new ApiError(400, "Claim status filter is invalid.");
    }

    query.status = filters.status;
  }

  if (filters.date !== undefined) {
    const startOfDay = normalizeClaimDate(filters.date);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    query.date = {
      $gte: startOfDay,
      $lt: endOfDay,
    };
  }

  return query;
}

async function getTeamUserIds(managerId) {
  return User.find({ managerId }).distinct("_id");
}

async function createClaim(userId, data) {
  const claim = await Claim.create({
    userId,
    type: normalizeClaimType(data.type),
    amount: normalizeAmount(data.amount),
    date: normalizeClaimDate(data.date),
    description: normalizeDescription(data.description),
    attachments: normalizeAttachments(data.attachments),
    status: CLAIM_STATUS.PENDING_MANAGER,
    reviewedBy: null,
    reviewComment: "",
  });

  return claim.toJSON();
}

async function getUserClaims(userId) {
  const claims = await Claim.find({ userId }).sort({ createdAt: -1 });

  return claims.map((claim) => claim.toJSON());
}

async function getAllClaims(requesterId, requesterRole, filters = {}) {
  const query = buildClaimQueryFilters(filters);

  if (requesterRole === USER_ROLES.MANAGER) {
    const teamUserIds = await getTeamUserIds(requesterId);
    query.userId = { $in: teamUserIds };
  }

  const claims = await Claim.find(query)
    .populate("userId", "fullName email employeeId role")
    .populate("managerReviewedBy", "fullName email role")
    .populate("reviewedBy", "fullName email role")
    .sort({ createdAt: -1 });

  return claims.map((claim) => claim.toJSON());
}

async function reviewClaim(reviewerId, claimId, action, comment) {
  const reviewer = await User.findById(reviewerId).select("_id role isActive");

  if (!reviewer || !reviewer.isActive) {
    throw new ApiError(401, "Reviewing user is inactive or no longer exists.");
  }

  const claim = await Claim.findById(claimId);

  if (!claim) {
    throw new ApiError(404, "Claim not found.");
  }

  const reviewComment = normalizeReviewComment(comment);
  const isApprove = action === "approved";
  const isReject = action === "rejected";

  if (!isApprove && !isReject) {
    throw new ApiError(400, "Review action must be either approved or rejected.");
  }

  if (reviewer.role === USER_ROLES.MANAGER) {
    if (claim.status !== CLAIM_STATUS.PENDING_MANAGER) {
      throw new ApiError(409, "This claim is not awaiting manager review.");
    }

    claim.managerReviewedBy = reviewer._id;
    claim.managerReviewedAt = new Date();
    claim.managerComment = reviewComment;

    if (isApprove) {
      claim.status = CLAIM_STATUS.PENDING_HR;
    } else {
      claim.status = CLAIM_STATUS.REJECTED;
      claim.reviewedBy = reviewer._id;
      claim.reviewedAt = new Date();
      claim.reviewComment = reviewComment;
    }
  } else if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.HR].includes(reviewer.role)) {
    if (claim.status !== CLAIM_STATUS.PENDING_HR) {
      throw new ApiError(409, "This claim is not awaiting HR/Admin review.");
    }

    claim.reviewedBy = reviewer._id;
    claim.reviewedAt = new Date();
    claim.reviewComment = reviewComment;
    claim.status = isApprove ? CLAIM_STATUS.APPROVED : CLAIM_STATUS.REJECTED;
  } else {
    throw new ApiError(403, "You do not have permission to review claims.");
  }

  await claim.save();

  logger.info("Claim reviewed.", {
    claimId: claim._id.toString(),
    userId: claim.userId.toString(),
    status: claim.status,
    type: claim.type,
    amount: claim.amount,
    reviewedBy: reviewer._id.toString(),
  });

  emitClaimReviewed({
    eventName: "claim.reviewed",
    claimId: claim._id.toString(),
    userId: claim.userId.toString(),
    status: claim.status,
    type: claim.type,
    amount: claim.amount,
    reviewedBy: reviewer._id.toString(),
    reviewComment,
  });

  return claim.toJSON();
}

module.exports = {
  createClaim,
  getAllClaims,
  getUserClaims,
  reviewClaim,
};
