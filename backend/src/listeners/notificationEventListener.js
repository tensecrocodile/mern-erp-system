const { CLAIM_EVENTS } = require("../services/claimEventService");
const { LEAVE_EVENTS } = require("../services/leaveEventService");
const notificationService = require("../services/notificationService");
const { TRIP_EVENTS } = require("../services/tripAlertService");
const logger = require("../utils/logger");
const eventBus = require("../utils/eventBus");

let listenersInitialized = false;

function handle(label, fn) {
  return (payload) => {
    Promise.resolve(fn(payload)).catch((err) => {
      logger.error(`Notification listener failed for ${label}.`, {
        message: err.message,
        stack:   err.stack,
      });
    });
  };
}

function initializeNotificationEventListeners() {
  if (listenersInitialized) return;

  // ── Trip ──
  eventBus.on(
    TRIP_EVENTS.IDLE_DETECTED,
    handle("trip.idle.detected", (p) => notificationService.createTripIdleNotificationsForAdmins(p))
  );

  // ── Claims ──
  eventBus.on(
    CLAIM_EVENTS.SUBMITTED,
    handle("claim.submitted", (p) => notificationService.createClaimSubmittedNotification(p))
  );

  eventBus.on(
    CLAIM_EVENTS.STAGE_PROGRESSED,
    handle("claim.stage.progressed", (p) => notificationService.createClaimStageProgressedNotification(p))
  );

  eventBus.on(
    CLAIM_EVENTS.REVIEWED,
    handle("claim.reviewed", (p) => notificationService.createClaimReviewNotification(p))
  );

  // ── Leaves ──
  eventBus.on(
    LEAVE_EVENTS.SUBMITTED,
    handle("leave.submitted", (p) => notificationService.createLeaveSubmittedNotification(p))
  );

  eventBus.on(
    LEAVE_EVENTS.STAGE_PROGRESSED,
    handle("leave.stage.progressed", (p) => notificationService.createLeaveStageProgressedNotification(p))
  );

  eventBus.on(
    LEAVE_EVENTS.REVIEWED,
    handle("leave.reviewed", (p) => notificationService.createLeaveReviewNotification(p))
  );

  listenersInitialized = true;
}

module.exports = { initializeNotificationEventListeners };
