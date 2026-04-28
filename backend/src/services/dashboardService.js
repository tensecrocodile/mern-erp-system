const Attendance = require("../models/Attendance");
const Claim = require("../models/Claim");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const Trip = require("../models/Trip");
const User = require("../models/User");
const { ATTENDANCE_STATUS, CLAIM_STATUS, LEAVE_STATUS, TRIP_STATUS, USER_ROLES } = require("../utils/constants");
const { getConfiguredTimeZone, getUtcStartOfDay } = require("../utils/date");

function getTodayRange() {
  const todayStart = getUtcStartOfDay(new Date());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  return {
    todayStart,
    tomorrowStart,
  };
}

function getYearRange() {
  const timeZone = getConfiguredTimeZone();
  const currentYear = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
    }).format(new Date())
  );
  const yearStart = getUtcStartOfDay(new Date(Date.UTC(currentYear, 0, 1)));
  const nextYearStart = getUtcStartOfDay(new Date(Date.UTC(currentYear + 1, 0, 1)));

  return {
    yearStart,
    nextYearStart,
  };
}

function formatDuration(totalMinutes) {
  const normalizedMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));

  return {
    totalMinutes: normalizedMinutes,
    hours: Math.floor(normalizedMinutes / 60),
    minutes: normalizedMinutes % 60,
  };
}

async function getOnLeaveCount(range, employeeIds = null) {
  const filter = {
    status: LEAVE_STATUS.APPROVED,
    startDate: { $lt: range.tomorrowStart },
    endDate: { $gte: range.todayStart },
  };
  if (employeeIds) filter.userId = { $in: employeeIds };

  const distinctUsers = await Leave.distinct("userId", filter);

  return distinctUsers.length;
}

async function getLeaveBalance(userId) {
  const defaultTotal = Number(process.env.DEFAULT_LEAVE_BALANCE) > 0 ? Number(process.env.DEFAULT_LEAVE_BALANCE) : 12;
  const { yearStart, nextYearStart } = getYearRange();
  const approvedLeaves = await Leave.find({
    userId,
    status: LEAVE_STATUS.APPROVED,
    startDate: { $lt: nextYearStart },
    endDate: { $gte: yearStart },
  }).select("startDate endDate").lean();

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const usedDays = approvedLeaves.reduce((total, leave) => {
    const clampedStart = leave.startDate < yearStart ? yearStart : leave.startDate;
    const clampedEnd = leave.endDate >= nextYearStart ? new Date(nextYearStart.getTime() - MS_PER_DAY) : leave.endDate;
    const days = Math.round((clampedEnd.getTime() - clampedStart.getTime()) / MS_PER_DAY) + 1;
    return total + Math.max(0, days);
  }, 0);

  const remaining = Math.max(0, defaultTotal - usedDays);

  return {
    remaining,
    total: defaultTotal,
    used: usedDays,
  };
}

async function getAdminDashboard(requester) {
  const { todayStart, tomorrowStart } = getTodayRange();

  // super_admin sees everything; admin is scoped to their company
  const companyId = requester.role !== USER_ROLES.SUPER_ADMIN ? requester.companyId : null;

  const userFilter = {
    isActive: true,
    role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
  };
  if (companyId) userFilter.companyId = companyId;

  // Fetch employee IDs for cross-model filtering (Attendance/Claim/Trip link via user ref, not companyId)
  let employeeIds = null;
  if (companyId) {
    employeeIds = (await User.find(userFilter).select("_id").lean()).map((u) => u._id);
  }

  const attendanceFilter = { workDate: todayStart };
  if (employeeIds) attendanceFilter.user = { $in: employeeIds };

  const claimFilter = { status: { $in: [CLAIM_STATUS.PENDING_MANAGER, CLAIM_STATUS.PENDING_HR] } };
  if (employeeIds) claimFilter.userId = { $in: employeeIds };

  const tripFilter = { status: TRIP_STATUS.ACTIVE, endedAt: null };
  if (employeeIds) tripFilter.user = { $in: employeeIds };

  const [totalEmployees, presentToday, onLeave, pendingClaims, activeTrips, idleEmployees] = await Promise.all([
    User.countDocuments(userFilter),
    Attendance.countDocuments(attendanceFilter),
    getOnLeaveCount({ todayStart, tomorrowStart }, employeeIds),
    Claim.countDocuments(claimFilter),
    Trip.countDocuments(tripFilter),
    Trip.countDocuments({
      ...tripFilter,
      "trackingState.activeIdleEventId": { $ne: null },
    }),
  ]);

  return {
    activeTrips,
    idleEmployees,
    onLeave,
    pendingClaims,
    presentToday,
    totalEmployees,
  };
}

async function getEmployeeDashboard(userId) {
  const { todayStart } = getTodayRange();

  const [attendanceToday, pendingClaims, upcomingHolidays, leaveBalance] = await Promise.all([
    Attendance.findOne({
      user: userId,
      workDate: todayStart,
    })
      .select("-__v")
      .lean(),
    Claim.countDocuments({
      userId,
      status: { $in: [CLAIM_STATUS.PENDING_MANAGER, CLAIM_STATUS.PENDING_HR] },
    }),
    Holiday.find({
      date: { $gte: todayStart },
      $or: [{ applicableTo: "all" }, { applicableTo: userId }],
    })
      .select("-scopeKey -__v")
      .sort({ date: 1, createdAt: -1 })
      .limit(5)
      .lean(),
    getLeaveBalance(userId),
  ]);

  let workedMinutes = 0;

  if (attendanceToday) {
    if (attendanceToday.status === ATTENDANCE_STATUS.CHECKED_IN && attendanceToday.checkIn?.time) {
      workedMinutes = Math.max(
        0,
        Math.round((Date.now() - new Date(attendanceToday.checkIn.time).getTime()) / (1000 * 60))
      );
    } else {
      workedMinutes = Number(attendanceToday.workingMinutes || 0);
    }
  }

  return {
    attendanceToday,
    leaveBalance,
    pendingClaims,
    totalHoursWorkedToday: formatDuration(workedMinutes),
    upcomingHolidays,
  };
}

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};
