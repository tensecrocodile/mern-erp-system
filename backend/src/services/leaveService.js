const Leave = require("../models/Leave");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { LEAVE_STATUS, LEAVE_TYPES, USER_ROLES } = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");
const { emitLeaveReviewed } = require("./leaveEventService");

function normalizeLeaveType(type) {
  if (!Object.values(LEAVE_TYPES).includes(type)) {
    throw new ApiError(400, "Leave type is invalid.");
  }

  return type;
}

function normalizeLeaveDate(dateInput, fieldName) {
  const parsedDate = new Date(dateInput);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date.`);
  }

  return getUtcStartOfDay(parsedDate);
}

function normalizeReason(reason) {
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";

  if (!normalizedReason) {
    throw new ApiError(400, "Leave reason is required.");
  }

  return normalizedReason;
}

function normalizeReviewComment(comment) {
  return typeof comment === "string" ? comment.trim() : "";
}

async function getTeamUserIds(managerId) {
  return User.find({ managerId }).distinct("_id");
}

async function applyLeave(userId, data) {
  const startDate = normalizeLeaveDate(data.startDate, "startDate");
  const endDate = normalizeLeaveDate(data.endDate, "endDate");

  if (endDate < startDate) {
    throw new ApiError(400, "endDate cannot be earlier than startDate.");
  }

  const overlappingLeave = await Leave.findOne({
    userId,
    status: { $in: [LEAVE_STATUS.APPROVED, LEAVE_STATUS.PENDING_MANAGER, LEAVE_STATUS.PENDING_HR] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });

  if (overlappingLeave) {
    const label = overlappingLeave.status === LEAVE_STATUS.APPROVED ? "an approved" : "a pending";
    throw new ApiError(409, `Leave dates overlap with ${label} leave request.`);
  }

  const leave = await Leave.create({
    userId,
    type: normalizeLeaveType(data.type),
    startDate,
    endDate,
    reason: normalizeReason(data.reason),
    status: LEAVE_STATUS.PENDING_MANAGER,
    reviewedBy: null,
    reviewComment: "",
  });

  return leave.toJSON();
}

async function getUserLeaves(userId) {
  const leaves = await Leave.find({ userId }).sort({ createdAt: -1 });

  return leaves.map((leave) => leave.toJSON());
}

async function getAllLeaves(requesterId, requesterRole, filters = {}) {
  const query = {};

  if (filters.status !== undefined) {
    if (!Object.values(LEAVE_STATUS).includes(filters.status)) {
      throw new ApiError(400, "Leave status filter is invalid.");
    }

    query.status = filters.status;
  }

  if (requesterRole === USER_ROLES.MANAGER) {
    const teamUserIds = await getTeamUserIds(requesterId);
    query.userId = { $in: teamUserIds };
  }

  const leaves = await Leave.find(query)
    .populate("userId", "fullName email employeeId role")
    .populate("managerReviewedBy", "fullName email role")
    .populate("reviewedBy", "fullName email role")
    .sort({ createdAt: -1 });

  return leaves.map((leave) => leave.toJSON());
}

async function reviewLeave(reviewerId, leaveId, action, comment) {
  const reviewer = await User.findById(reviewerId).select("_id role isActive");

  if (!reviewer || !reviewer.isActive) {
    throw new ApiError(401, "Reviewing user is inactive or no longer exists.");
  }

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    throw new ApiError(404, "Leave request not found.");
  }

  const reviewComment = normalizeReviewComment(comment);
  const isApprove = action === "approved";
  const isReject = action === "rejected";

  if (!isApprove && !isReject) {
    throw new ApiError(400, "Review action must be either approved or rejected.");
  }

  if (reviewer.role === USER_ROLES.MANAGER) {
    if (leave.status !== LEAVE_STATUS.PENDING_MANAGER) {
      throw new ApiError(409, "This leave request is not awaiting manager review.");
    }

    leave.managerReviewedBy = reviewer._id;
    leave.managerReviewedAt = new Date();
    leave.managerComment = reviewComment;

    if (isApprove) {
      leave.status = LEAVE_STATUS.PENDING_HR;
    } else {
      leave.status = LEAVE_STATUS.REJECTED;
      leave.reviewedBy = reviewer._id;
      leave.reviewedAt = new Date();
      leave.reviewComment = reviewComment;
    }
  } else if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.HR].includes(reviewer.role)) {
    if (leave.status !== LEAVE_STATUS.PENDING_HR) {
      throw new ApiError(409, "This leave request is not awaiting HR/Admin review.");
    }

    leave.reviewedBy = reviewer._id;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment;
    leave.status = isApprove ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED;
  } else {
    throw new ApiError(403, "You do not have permission to review leave requests.");
  }

  await leave.save();

  emitLeaveReviewed({
    eventName: "leave.reviewed",
    leaveId: leave._id.toString(),
    userId: leave.userId.toString(),
    type: leave.type,
    status: leave.status,
    reviewedBy: reviewer._id.toString(),
    reviewComment: leave.reviewComment,
    startDate: leave.startDate.toISOString(),
    endDate: leave.endDate.toISOString(),
  });

  return leave.toJSON();
}

module.exports = {
  applyLeave,
  getAllLeaves,
  getUserLeaves,
  reviewLeave,
};
