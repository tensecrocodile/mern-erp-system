const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  HR: "hr",
  EMPLOYEE: "employee",
  MANAGER: "manager",
});

const WORK_MODES = Object.freeze({
  OFFICE: "office",
  FIELD: "field",
  REMOTE: "remote",
});

const ATTENDANCE_STATUS = Object.freeze({
  CHECKED_IN: "checked_in",
  FULL_DAY: "full_day",
  HALF_DAY: "half_day",
});

const TRIP_STATUS = Object.freeze({
  ACTIVE: "active",
  COMPLETED: "completed",
});

const TRIP_IDLE_EVENT_STATUS = Object.freeze({
  ACTIVE: "active",
  RESOLVED: "resolved",
});

const ALERT_EVENT_TYPES = Object.freeze({
  TRIP_IDLE_DETECTED: "trip_idle_detected",
});

const CLAIM_TYPES = Object.freeze({
  TRAVEL: "travel",
  FOOD: "food",
  ACCOMMODATION: "accommodation",
  OTHER: "other",
});

const CLAIM_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const HOLIDAY_TYPES = Object.freeze({
  COMPANY: "company",
  OPTIONAL: "optional",
  CUSTOM: "custom",
});

const LEAVE_TYPES = Object.freeze({
  CASUAL: "casual",
  SICK: "sick",
  EARNED: "earned",
  OTHER: "other",
});

const LEAVE_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const NOTIFICATION_TYPES = Object.freeze({
  ANNOUNCEMENT: "announcement",
  CLAIM: "claim",
  IDLE: "idle",
  LEAVE: "leave",
});

module.exports = {
  ALERT_EVENT_TYPES,
  ATTENDANCE_STATUS,
  CLAIM_STATUS,
  CLAIM_TYPES,
  HOLIDAY_TYPES,
  LEAVE_STATUS,
  LEAVE_TYPES,
  NOTIFICATION_TYPES,
  TRIP_IDLE_EVENT_STATUS,
  TRIP_STATUS,
  USER_ROLES,
  WORK_MODES,
};
