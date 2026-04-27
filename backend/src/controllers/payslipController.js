const payslipService = require("../services/payslipService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.uploadPayslip = asyncHandler(async (req, res) => {
  const payslip = await payslipService.uploadPayslip(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Payslip uploaded successfully.",
    data: { payslip },
  });
});

exports.getMyPayslips = asyncHandler(async (req, res) => {
  const payslips = await payslipService.getMyPayslips(req.user._id);
  return sendSuccess(res, {
    message: "My payslips fetched successfully.",
    data: { payslips },
  });
});

exports.getAllPayslips = asyncHandler(async (req, res) => {
  const payslips = await payslipService.getAllPayslips(req.query);
  return sendSuccess(res, {
    message: "Payslips fetched successfully.",
    data: { payslips },
  });
});

exports.getPayslipById = asyncHandler(async (req, res) => {
  const payslip = await payslipService.getPayslipById(
    req.params.id,
    req.user._id,
    req.user.role
  );
  return sendSuccess(res, {
    message: "Payslip fetched successfully.",
    data: { payslip },
  });
});
