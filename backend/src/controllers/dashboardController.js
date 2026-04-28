const dashboardService = require("../services/dashboardService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.getAdminDashboard = asyncHandler(async (req, res) => {
  const dashboard = await dashboardService.getAdminDashboard(req.user);

  return sendSuccess(res, {
    message: "Admin dashboard fetched successfully.",
    data: dashboard,
  });
});

exports.getMyDashboard = asyncHandler(async (req, res) => {
  const dashboard = await dashboardService.getEmployeeDashboard(req.user._id);

  return sendSuccess(res, {
    message: "Employee dashboard fetched successfully.",
    data: dashboard,
  });
});
