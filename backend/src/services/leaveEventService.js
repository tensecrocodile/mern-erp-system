const eventBus = require("../utils/eventBus");

const LEAVE_EVENTS = Object.freeze({
  SUBMITTED:        "leave.submitted",
  STAGE_PROGRESSED: "leave.stage.progressed",
  REVIEWED:         "leave.reviewed",
});

function emitLeaveSubmitted(payload) {
  eventBus.emit(LEAVE_EVENTS.SUBMITTED, payload);
}

function emitLeaveStageProgressed(payload) {
  eventBus.emit(LEAVE_EVENTS.STAGE_PROGRESSED, payload);
}

function emitLeaveReviewed(payload) {
  eventBus.emit(LEAVE_EVENTS.REVIEWED, payload);
}

module.exports = {
  LEAVE_EVENTS,
  emitLeaveSubmitted,
  emitLeaveStageProgressed,
  emitLeaveReviewed,
};
