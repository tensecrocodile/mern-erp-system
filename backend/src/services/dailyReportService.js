const DailyReport = require("../models/DailyReport");
const ApiError = require("../utils/apiError");

function toDateOnly(dateInput) {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function submitDailyReport(userId, data) {
  const workDate = toDateOnly(data.workDate || new Date());

  const existing = await DailyReport.findOne({ userId, workDate });
  if (existing) {
    Object.assign(existing, {
      plannedItems: data.plannedItems || existing.plannedItems,
      activityItems: data.activityItems || existing.activityItems,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      submittedAt: new Date(),
    });
    await existing.save();
    return existing.toJSON();
  }

  const report = await DailyReport.create({
    userId,
    workDate,
    plannedItems: data.plannedItems || [],
    activityItems: data.activityItems || [],
    notes: data.notes || "",
    submittedAt: new Date(),
  });

  return report.toJSON();
}

async function getMyReports(userId, filters = {}) {
  const query = { userId };
  if (filters.from || filters.to) {
    query.workDate = {};
    if (filters.from) query.workDate.$gte = toDateOnly(filters.from);
    if (filters.to) query.workDate.$lte = toDateOnly(filters.to);
  }

  const reports = await DailyReport.find(query).sort({ workDate: -1 }).lean();
  return reports;
}

async function getAllReports(filters = {}) {
  const query = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.from || filters.to) {
    query.workDate = {};
    if (filters.from) query.workDate.$gte = toDateOnly(filters.from);
    if (filters.to) query.workDate.$lte = toDateOnly(filters.to);
  }

  const reports = await DailyReport.find(query)
    .populate("userId", "fullName email employeeId")
    .sort({ workDate: -1, createdAt: -1 })
    .lean();

  return reports;
}

async function getReportById(reportId, userId, role) {
  const report = await DailyReport.findById(reportId)
    .populate("userId", "fullName email employeeId")
    .lean();

  if (!report) throw new ApiError(404, "Report not found.");

  const isOwner = String(report.userId._id || report.userId) === String(userId);
  const isPrivileged = ["admin", "manager", "hr"].includes(role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, "Access denied.");
  }

  return report;
}

module.exports = { submitDailyReport, getMyReports, getAllReports, getReportById };
