const { CLAIM_EVENTS } = require("../services/claimEventService");
const { LEAVE_EVENTS } = require("../services/leaveEventService");
const notificationService = require("../services/notificationService");
const { TRIP_EVENTS } = require("../services/tripAlertService");
const logger = require("../utils/logger");
const eventBus = require("../utils/eventBus");

let listenersInitialized = false;

async function handleTripIdleDetected(payload) {
  await notificationService.createTripIdleNotificationsForAdmins(payload);
}

async function handleClaimReviewed(payload) {
  await notificationService.createClaimReviewNotification(payload);
}

async function handleLeaveReviewed(payload) {
  await notificationService.createLeaveReviewNotification(payload);
}

function initializeNotificationEventListeners() {
  if (listenersInitialized) {
    return;
  }

  eventBus.on(TRIP_EVENTS.IDLE_DETECTED, (payload) => {
    Promise.resolve(handleTripIdleDetected(payload)).catch((error) => {
      logger.error("Notification listener failed for trip.idle.detected.", {
        message: error.message,
        stack: error.stack,
      });
    });
  });

  eventBus.on(CLAIM_EVENTS.REVIEWED, (payload) => {
    Promise.resolve(handleClaimReviewed(payload)).catch((error) => {
      logger.error("Notification listener failed for claim.reviewed.", {
        message: error.message,
        stack: error.stack,
      });
    });
  });

  eventBus.on(LEAVE_EVENTS.REVIEWED, (payload) => {
    Promise.resolve(handleLeaveReviewed(payload)).catch((error) => {
      logger.error("Notification listener failed for leave.reviewed.", {
        message: error.message,
        stack: error.stack,
      });
    });
  });

  listenersInitialized = true;
}

module.exports = {
  initializeNotificationEventListeners,
};
