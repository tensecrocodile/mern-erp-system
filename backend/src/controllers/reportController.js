const reportService = require("../services/reportService");
const asyncHandler = require("../utils/asyncHandler");

exports.exportAttendance = asyncHandler(async (req, res) => {
  const csv = await reportService.getAttendanceCSV(req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="attendance.csv"');
  res.status(200).send(csv);
});
