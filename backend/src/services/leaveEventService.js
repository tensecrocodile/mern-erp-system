const eventBus = require("../utils/eventBus");

const LEAVE_EVENTS = Object.freeze({
  REVIEWED: "leave.reviewed",
});

function emitLeaveReviewed(payload) {
  eventBus.emit(LEAVE_EVENTS.REVIEWED, payload);
}

module.exports = {
  emitLeaveReviewed,
  LEAVE_EVENTS,
};
