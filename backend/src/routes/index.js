const express = require("express");

const announcementRoutes = require("./announcementRoutes");
const approvalRoutes = require("./approvalRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const authRoutes = require("./authRoutes");
const claimRoutes = require("./claimRoutes");
const dailyReportRoutes = require("./dailyReportRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const externalApiRoutes = require("./externalApiRoutes");
const geoFenceRoutes = require("./geoFenceRoutes");
const holidayRoutes = require("./holidayRoutes");
const leaveRoutes = require("./leaveRoutes");
const mapplsRoutes = require("./mapplsRoutes");
const meetingRoutes = require("./meetingRoutes");
const notificationRoutes = require("./notificationRoutes");
const payslipRoutes = require("./payslipRoutes");
const reportRoutes = require("./reportRoutes");
const trackingRoutes = require("./trackingRoutes");
const tripRoutes = require("./tripRoutes");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.use("/announcements", announcementRoutes);
router.use("/approvals", approvalRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/auth", authRoutes);
router.use("/claims", claimRoutes);
router.use("/daily-reports", dailyReportRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/external", externalApiRoutes);
router.use("/geofences", geoFenceRoutes);
router.use("/holidays", holidayRoutes);
router.use("/leaves", leaveRoutes);
router.use("/map", mapplsRoutes);
router.use("/meetings", meetingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payslips", payslipRoutes);
router.use("/reports", reportRoutes);
router.use("/tracking", trackingRoutes);
router.use("/trips", tripRoutes);
router.use("/users", userRoutes);

module.exports = router;
