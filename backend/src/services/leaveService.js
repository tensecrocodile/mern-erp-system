const Leave = require("../models/Leave");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { LEAVE_STATUS, LEAVE_TYPES, USER_ROLES } = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");
const { reviewRequest } = require("./approvalWorkflowService");
const {
  emitLeaveSubmitted,
  emitLeaveStageProgressed,
  emitLeaveReviewed,
} = require("./leaveEventService");

// ── Normalisation helpers ──────────────────────────────────────

function normalizeLeaveType(type) {
  if (!Object.values(LEAVE_TYPES).includes(type)) throw new ApiError(400, "Leave type is invalid.");
  return type;
}

function normalizeLeaveDate(dateInput, fieldName) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${fieldName} must be a valid ISO date.`);
  return getUtcStartOfDay(d);
}

function normalizeReason(reason) {
  const s = typeof reason === "string" ? reason.trim() : "";
  if (!s) throw new ApiError(400, "Leave reason is required.");
  return s;
}

async function getTeamUserIds(managerId) {
  return User.find({ managerId }).distinct("_id");
}

// ── Public API ─────────────────────────────────────────────────

async function applyLeave(userId, data) {
  const startDate = normalizeLeaveDate(data.startDate, "startDate");
  const endDate   = normalizeLeaveDate(data.endDate,   "endDate");

  if (endDate < startDate) throw new ApiError(400, "endDate cannot be earlier than startDate.");

  const overlap = await Leave.findOne({
    userId,
    status:    { $in: [LEAVE_STATUS.APPROVED, LEAVE_STATUS.PENDING_MANAGER, LEAVE_STATUS.PENDING_HR] },
    startDate: { $lte: endDate },
    endDate:   { $gte: startDate },
  });

  if (overlap) {
    const label = overlap.status === LEAVE_STATUS.APPROVED ? "an approved" : "a pending";
    throw new ApiError(409, `Leave dates overlap with ${label} leave request.`);
  }

  const leave = await Leave.create({
    userId,
    type:      normalizeLeaveType(data.type),
    startDate,
    endDate,
    reason:    normalizeReason(data.reason),
    status:        LEAVE_STATUS.PENDING_MANAGER,
    currentStage:  "manager",
    approvalHistory: [],
  });

  emitLeaveSubmitted({
    eventName: "leave.submitted",
    leaveId:   leave._id.toString(),
    userId:    leave.userId.toString(),
    type:      leave.type,
    startDate: leave.startDate.toISOString(),
    endDate:   leave.endDate.toISOString(),
  });

  return leave.toJSON();
}

async function getUserLeaves(userId) {
  const leaves = await Leave.find({ userId })
    .populate("approvalHistory.by", "fullName role")
    .sort({ createdAt: -1 });
  return leaves.map((l) => l.toJSON());
}

async function getAllLeaves(requesterId, requesterRole, filters = {}) {
  const query = {};

  if (filters.status !== undefined) {
    if (!Object.values(LEAVE_STATUS).includes(filters.status))
      throw new ApiError(400, "Leave status filter is invalid.");
    query.status = filters.status;
  }

  if (requesterRole === USER_ROLES.MANAGER) {
    const teamUserIds = await getTeamUserIds(requesterId);
    query.userId = { $in: teamUserIds };
  }

  const leaves = await Leave.find(query)
    .populate("userId", "fullName email employeeId role")
    .populate("approvalHistory.by", "fullName role")
    .sort({ createdAt: -1 });

  return leaves.map((l) => l.toJSON());
}

async function reviewLeave(reviewerId, leaveId, action, comment) {
  const { doc: leave, reviewer, previousStatus } = await reviewRequest({
    model:      Leave,
    requestId:  leaveId,
    reviewerId,
    action,
    comment,
  });

  const isFinalized = leave.status === LEAVE_STATUS.APPROVED || leave.status === LEAVE_STATUS.REJECTED;

  if (isFinalized) {
    emitLeaveReviewed({
      eventName:     "leave.reviewed",
      leaveId:       leave._id.toString(),
      userId:        leave.userId.toString(),
      type:          leave.type,
      status:        leave.status,
      reviewedBy:    reviewer._id.toString(),
      reviewComment: typeof comment === "string" ? comment.trim() : "",
      startDate:     leave.startDate.toISOString(),
      endDate:       leave.endDate.toISOString(),
    });
  } else {
    emitLeaveStageProgressed({
      eventName:    "leave.stage.progressed",
      leaveId:      leave._id.toString(),
      userId:       leave.userId.toString(),
      status:       leave.status,
      previousStatus,
      type:         leave.type,
      progressedBy: reviewer._id.toString(),
      startDate:    leave.startDate.toISOString(),
      endDate:      leave.endDate.toISOString(),
    });
  }

  return leave.toJSON();
}

module.exports = { applyLeave, getAllLeaves, getUserLeaves, reviewLeave };
