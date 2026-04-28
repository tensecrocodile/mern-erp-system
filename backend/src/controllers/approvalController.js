const approvalService = require("../services/approvalService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.getApprovals = asyncHandler(async (req, res) => {
  const data = await approvalService.getPendingApprovals(req.user._id);
  return sendSuccess(res, {
    message: "Pending approvals fetched successfully.",
    data,
  });
});
