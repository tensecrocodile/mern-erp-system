const eventBus = require("../utils/eventBus");

const TRIP_EVENTS = Object.freeze({
  IDLE_DETECTED: "trip.idle.detected",
});

function emitIdleAlert(payload) {
  eventBus.emit(TRIP_EVENTS.IDLE_DETECTED, payload);
}

module.exports = {
  emitIdleAlert,
  TRIP_EVENTS,
};
