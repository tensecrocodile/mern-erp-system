const Claim = require("../models/Claim");
const Leave = require("../models/Leave");
const { CLAIM_STATUS, LEAVE_STATUS } = require("../utils/constants");

async function getPendingApprovals() {
  const [pendingClaims, pendingLeaves] = await Promise.all([
    Claim.find({ status: CLAIM_STATUS.PENDING })
      .populate("userId", "fullName email employeeId")
      .sort({ createdAt: 1 })
      .lean(),
    Leave.find({ status: LEAVE_STATUS.PENDING })
      .populate("userId", "fullName email employeeId")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return { pendingClaims, pendingLeaves };
}

module.exports = { getPendingApprovals };
