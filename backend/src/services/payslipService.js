const Payslip = require("../models/Payslip");
const ApiError = require("../utils/apiError");

async function uploadPayslip(adminUserId, data) {
  const { userId, month, year, components = [], fileUrl = "" } = data;

  const existing = await Payslip.findOne({ userId, month, year });
  if (existing) {
    throw new ApiError(409, "A payslip for this employee and month already exists.");
  }

  const earnings = components.filter((c) => c.type === "earning").reduce((s, c) => s + c.amount, 0);
  const deductions = components.filter((c) => c.type === "deduction").reduce((s, c) => s + c.amount, 0);
  const grossPay = data.grossPay !== undefined ? data.grossPay : earnings;
  const netPay = data.netPay !== undefined ? data.netPay : earnings - deductions;

  const payslip = await Payslip.create({
    userId,
    month,
    year,
    components,
    grossPay,
    netPay,
    fileUrl,
    uploadedBy: adminUserId,
  });

  return payslip.toJSON();
}

async function getMyPayslips(userId) {
  const payslips = await Payslip.find({ userId }).sort({ year: -1, month: -1 }).lean();
  return payslips;
}

async function getAllPayslips(filters = {}) {
  const query = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.year) query.year = Number(filters.year);
  if (filters.month) query.month = Number(filters.month);

  const payslips = await Payslip.find(query)
    .populate("userId", "fullName email employeeId")
    .populate("uploadedBy", "fullName")
    .sort({ year: -1, month: -1, createdAt: -1 })
    .lean();

  return payslips;
}

async function getPayslipById(payslipId, userId, role) {
  const payslip = await Payslip.findById(payslipId)
    .populate("userId", "fullName email employeeId")
    .populate("uploadedBy", "fullName")
    .lean();

  if (!payslip) throw new ApiError(404, "Payslip not found.");

  const isOwner = String(payslip.userId._id || payslip.userId) === String(userId);
  const isPrivileged = ["admin", "hr"].includes(role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, "Access denied.");
  }

  return payslip;
}

module.exports = { uploadPayslip, getMyPayslips, getAllPayslips, getPayslipById };
