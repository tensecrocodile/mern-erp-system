const Claim = require("../models/Claim");
const Leave = require("../models/Leave");
const User = require("../models/User");
const { CLAIM_STATUS, LEAVE_STATUS, USER_ROLES } = require("../utils/constants");

async function getTeamUserIds(managerId) {
  return User.find({ managerId }).distinct("_id");
}

async function getPendingApprovals(requesterId) {
  const requester = await User.findById(requesterId).select("role").lean();

  let claimStatusFilter;
  let leaveStatusFilter;
  let userScopeFilter = {};

  if (requester.role === USER_ROLES.MANAGER) {
    claimStatusFilter = CLAIM_STATUS.PENDING_MANAGER;
    leaveStatusFilter = LEAVE_STATUS.PENDING_MANAGER;
    const teamUserIds = await getTeamUserIds(requesterId);
    userScopeFilter = { userId: { $in: teamUserIds } };
  } else {
    // HR, ADMIN, SUPER_ADMIN see items that have passed the manager stage
    claimStatusFilter = CLAIM_STATUS.PENDING_HR;
    leaveStatusFilter = LEAVE_STATUS.PENDING_HR;
  }

  const [pendingClaims, pendingLeaves] = await Promise.all([
    Claim.find({ status: claimStatusFilter, ...userScopeFilter })
      .populate("userId", "fullName email employeeId")
      .sort({ createdAt: 1 })
      .lean(),
    Leave.find({ status: leaveStatusFilter, ...userScopeFilter })
      .populate("userId", "fullName email employeeId")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return { pendingClaims, pendingLeaves };
}

module.exports = { getPendingApprovals };
