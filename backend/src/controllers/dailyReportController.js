const dailyReportService = require("../services/dailyReportService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.submitReport = asyncHandler(async (req, res) => {
  const report = await dailyReportService.submitDailyReport(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Daily report submitted successfully.",
    data: { report },
  });
});

exports.getMyReports = asyncHandler(async (req, res) => {
  const reports = await dailyReportService.getMyReports(req.user._id, req.query);
  return sendSuccess(res, {
    message: "My daily reports fetched successfully.",
    data: { reports },
  });
});

exports.getAllReports = asyncHandler(async (req, res) => {
  const reports = await dailyReportService.getAllReports(req.query);
  return sendSuccess(res, {
    message: "Daily reports fetched successfully.",
    data: { reports },
  });
});

exports.getReportById = asyncHandler(async (req, res) => {
  const report = await dailyReportService.getReportById(
    req.params.id,
    req.user._id,
    req.user.role
  );
  return sendSuccess(res, {
    message: "Daily report fetched successfully.",
    data: { report },
  });
});
