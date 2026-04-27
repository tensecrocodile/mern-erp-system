const Attendance = require("../models/Attendance");

function escapeCSV(value) {
  if (value == null) return "";
  let str = String(value);
  // Prefix formula-starting characters to prevent CSV injection in Excel/Sheets
  if (str.length > 0 && ["=", "+", "-", "@", "\t", "\r"].includes(str[0])) {
    str = `'${str}`;
  }
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function buildCSV(rows) {
  if (!rows.length) return "date,employeeId,name,email,status,checkInTime,checkOutTime,workingMinutes,checkInAddress,checkOutAddress\n";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(",")),
  ].join("\n");
}

async function getAttendanceCSV(filters = {}) {
  const query = {};

  if (filters.from || filters.to) {
    query.workDate = {};
    if (filters.from) {
      const from = new Date(filters.from);
      if (!Number.isNaN(from.getTime())) query.workDate.$gte = from;
    }
    if (filters.to) {
      const to = new Date(filters.to);
      if (!Number.isNaN(to.getTime())) query.workDate.$lte = to;
    }
  }

  const records = await Attendance.find(query)
    .populate("user", "fullName email employeeId")
    .sort({ workDate: -1, createdAt: -1 })
    .lean();

  const rows = records.map((r) => ({
    date: r.workDate ? new Date(r.workDate).toISOString().slice(0, 10) : "",
    employeeId: r.user?.employeeId || "",
    name: r.user?.fullName || "",
    email: r.user?.email || "",
    status: r.status || "",
    checkInTime: r.checkIn?.time ? new Date(r.checkIn.time).toISOString() : "",
    checkOutTime: r.checkOut?.time ? new Date(r.checkOut.time).toISOString() : "",
    workingMinutes: r.workingMinutes ?? 0,
    checkInAddress: r.checkIn?.location?.address || "",
    checkOutAddress: r.checkOut?.location?.address || "",
  }));

  return buildCSV(rows);
}

module.exports = { getAttendanceCSV };
