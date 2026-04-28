const eventBus = require("../utils/eventBus");

const CLAIM_EVENTS = Object.freeze({
  SUBMITTED:        "claim.submitted",
  STAGE_PROGRESSED: "claim.stage.progressed",
  REVIEWED:         "claim.reviewed",
});

function emitClaimSubmitted(payload) {
  eventBus.emit(CLAIM_EVENTS.SUBMITTED, payload);
}

function emitClaimStageProgressed(payload) {
  eventBus.emit(CLAIM_EVENTS.STAGE_PROGRESSED, payload);
}

function emitClaimReviewed(payload) {
  eventBus.emit(CLAIM_EVENTS.REVIEWED, payload);
}

module.exports = {
  CLAIM_EVENTS,
  emitClaimSubmitted,
  emitClaimStageProgressed,
  emitClaimReviewed,
};
