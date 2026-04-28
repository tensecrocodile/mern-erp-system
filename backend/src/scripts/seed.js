require("dotenv").config();

const mongoose = require("mongoose");

const { connectDatabase, disconnectDatabase } = require("../config/database");
const Attendance = require("../models/Attendance");
const Claim = require("../models/Claim");
const GeoFence = require("../models/GeoFence");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const Notification = require("../models/Notification");
const Trip = require("../models/Trip");
const User = require("../models/User");
const {
  ATTENDANCE_STATUS,
  CLAIM_STATUS,
  CLAIM_TYPES,
  HOLIDAY_TYPES,
  LEAVE_STATUS,
  LEAVE_TYPES,
  TRIP_IDLE_EVENT_STATUS,
  TRIP_STATUS,
  USER_ROLES,
  WORK_MODES,
} = require("../utils/constants");
const { getUtcStartOfDay } = require("../utils/date");
const logger = require("../utils/logger");

async function clearDemoCollections() {
  await Promise.all([
    Attendance.deleteMany({}),
    Claim.deleteMany({}),
    GeoFence.deleteMany({}),
    Holiday.deleteMany({}),
    Leave.deleteMany({}),
    Notification.deleteMany({}),
    Trip.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function createUsers() {
  const admin = await User.create({
    fullName: "ERP Admin",
    email: "admin@erp.demo",
    password: "Admin@123",
    employeeId: "ADM001",
    role: USER_ROLES.SUPER_ADMIN,
    workMode: WORK_MODES.FIELD,
    isActive: true,
  });

  const employeeOne = await User.create({
    fullName: "Rahul Sharma",
    email: "rahul@erp.demo",
    password: "Employee@123",
    employeeId: "EMP001",
    role: USER_ROLES.EMPLOYEE,
    workMode: WORK_MODES.FIELD,
    isActive: true,
  });

  const manager = await User.create({
    fullName: "Rajan Mehta",
    email: "manager@erp.demo",
    password: "Admin@123",
    employeeId: "MGR001",
    role: USER_ROLES.MANAGER,
    workMode: WORK_MODES.OFFICE,
    isActive: true,
  });

  const hr = await User.create({
    fullName: "Sunita Rao",
    email: "hr@erp.demo",
    password: "Admin@123",
    employeeId: "HR001",
    role: USER_ROLES.HR,
    workMode: WORK_MODES.OFFICE,
    isActive: true,
  });

  const employeeTwo = await User.create({
    fullName: "Priya Nair",
    email: "priya@erp.demo",
    password: "Employee@123",
    employeeId: "EMP002",
    role: USER_ROLES.EMPLOYEE,
    workMode: WORK_MODES.FIELD,
    managerId: manager._id,
    isActive: true,
  });

  // link employeeOne to manager
  await User.findByIdAndUpdate(employeeOne._id, { managerId: manager._id });

  return {
    admin,
    manager,
    hr,
    employeeOne,
    employeeTwo,
  };
}

async function createHoliday(adminId, employeeTwoId) {
  const upcomingHolidayDate = new Date(getUtcStartOfDay(new Date()).getTime() + 2 * 24 * 60 * 60 * 1000);

  await Holiday.create({
    name: "Founders Day",
    date: upcomingHolidayDate,
    type: HOLIDAY_TYPES.COMPANY,
    applicableTo: "all",
    scopeKey: "all",
    createdBy: adminId,
  });

  await Holiday.create({
    name: "Custom Ops Break",
    date: new Date(upcomingHolidayDate.getTime() + 24 * 60 * 60 * 1000),
    type: HOLIDAY_TYPES.CUSTOM,
    applicableTo: [employeeTwoId],
    scopeKey: employeeTwoId.toString(),
    createdBy: adminId,
  });
}

async function createAttendance(employeeId) {
  const today = getUtcStartOfDay(new Date());
  const checkInTime = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const checkOutTime = new Date(today.getTime() + 17 * 60 * 60 * 1000 + 30 * 60 * 1000);

  await Attendance.create({
    user: employeeId,
    workDate: today,
    checkIn: {
      time: checkInTime,
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        address: "Connaught Place, Delhi",
        accuracy: 10,
      },
      selfieUrl: "https://example.com/selfies/rahul-checkin.jpg",
      matchedGeoFence: null,
    },
    checkOut: {
      time: checkOutTime,
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        address: "Connaught Place, Delhi",
        accuracy: 8,
      },
      selfieUrl: "https://example.com/selfies/rahul-checkout.jpg",
      matchedGeoFence: null,
    },
    status: ATTENDANCE_STATUS.FULL_DAY,
    workingMinutes: 510,
  });
}

async function createTrip(employeeId) {
  const today = getUtcStartOfDay(new Date());
  const startedAt = new Date(today.getTime() + 10 * 60 * 60 * 1000);
  const idleStartedAt = new Date(startedAt.getTime() + 10 * 60 * 1000);
  const lastSeenAt = new Date(idleStartedAt.getTime() + 7 * 60 * 1000);

  const trip = new Trip({
    user: employeeId,
    status: TRIP_STATUS.ACTIVE,
    startedAt,
    endedAt: null,
    startLocation: {
      latitude: 28.6139,
      longitude: 77.209,
      address: "Client Site A",
      accuracy: 10,
    },
    endLocation: null,
    notes: "Demo trip in progress",
    routePoints: [
      {
        recordedAt: startedAt,
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          address: "Client Site A",
          accuracy: 10,
        },
        distanceFromPreviousMeters: 0,
      },
      {
        recordedAt: lastSeenAt,
        location: {
          latitude: 28.61401,
          longitude: 77.20905,
          address: "Client Site A",
          accuracy: 12,
        },
        distanceFromPreviousMeters: 12,
      },
    ],
    totalDistanceMeters: 12,
    idleEvents: [
      {
        startedAt: idleStartedAt,
        endedAt: null,
        durationMinutes: 7,
        anchorLocation: {
          latitude: 28.614,
          longitude: 77.20904,
          address: "Client Site A",
          accuracy: 12,
        },
        radiusMeters: 20,
        thresholdMinutes: 5,
        maxDistanceMeters: 9,
        alertTriggeredAt: lastSeenAt,
        status: TRIP_IDLE_EVENT_STATUS.ACTIVE,
      },
    ],
    alertEvents: [
      {
        type: "trip_idle_detected",
        severity: "warning",
        createdAt: lastSeenAt,
        message: "Trip idle detected for more than 5 minutes within 20 meters.",
        metadata: {
          radiusMeters: 20,
          thresholdMinutes: 5,
        },
      },
    ],
    trackingState: {
      lastLocation: {
        recordedAt: lastSeenAt,
        location: {
          latitude: 28.61401,
          longitude: 77.20905,
          address: "Client Site A",
          accuracy: 12,
        },
        distanceFromPreviousMeters: 12,
      },
      idleCandidate: {
        anchorLocation: {
          latitude: 28.614,
          longitude: 77.20904,
          address: "Client Site A",
          accuracy: 12,
        },
        startedAt: idleStartedAt,
        lastSeenAt,
        maxDistanceMeters: 9,
      },
      activeIdleEventId: null,
    },
  });

  trip.trackingState.activeIdleEventId = trip.idleEvents[0]._id;
  await trip.save();
}

async function createClaim(employeeId, adminId) {
  await Claim.create({
    userId: employeeId,
    type: CLAIM_TYPES.TRAVEL,
    amount: 1250,
    date: getUtcStartOfDay(new Date()),
    description: "Taxi and parking expenses for client visit.",
    attachments: ["https://example.com/claims/travel-receipt-1.jpg"],
    status: CLAIM_STATUS.PENDING_MANAGER,
    reviewedBy: null,
    reviewComment: "",
  });

  await Claim.create({
    userId: employeeId,
    type: CLAIM_TYPES.FOOD,
    amount: 450,
    date: new Date(getUtcStartOfDay(new Date()).getTime() - 24 * 60 * 60 * 1000),
    description: "Meal expense during branch visit.",
    attachments: ["https://example.com/claims/food-receipt-1.jpg"],
    status: CLAIM_STATUS.APPROVED,
    reviewedBy: adminId,
    reviewComment: "Approved for reimbursement.",
  });
}

async function createLeaves(employeeTwoId, adminId) {
  const today = getUtcStartOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  await Leave.create({
    userId: employeeTwoId,
    type: LEAVE_TYPES.CASUAL,
    startDate: today,
    endDate: tomorrow,
    reason: "Family function",
    status: LEAVE_STATUS.APPROVED,
    reviewedBy: adminId,
    reviewComment: "Approved.",
  });
}

async function runSeed() {
  await connectDatabase();

  try {
    await clearDemoCollections();

    const { admin, employeeOne, employeeTwo } = await createUsers();

    await Promise.all([
      createHoliday(admin._id, employeeTwo._id),
      createAttendance(employeeOne._id),
      createTrip(employeeOne._id),
      createClaim(employeeOne._id, admin._id),
      createLeaves(employeeTwo._id, admin._id),
    ]);

    logger.info("Seed data created successfully.", {
      adminEmail: admin.email,
      employeeEmails: [employeeOne.email, employeeTwo.email],
    });
  } finally {
    await disconnectDatabase();
  }
}

runSeed()
  .then(() => {
    logger.info("Database seeding completed.");
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error("Database seeding failed.", {
      message: error.message,
      stack: error.stack,
    });

    try {
      if (mongoose.connection.readyState !== 0) {
        await disconnectDatabase();
      }
    } finally {
      process.exit(1);
    }
  });
