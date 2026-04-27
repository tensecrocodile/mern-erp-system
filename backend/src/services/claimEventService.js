const eventBus = require("../utils/eventBus");

const CLAIM_EVENTS = Object.freeze({
  REVIEWED: "claim.reviewed",
});

function emitClaimReviewed(payload) {
  eventBus.emit(CLAIM_EVENTS.REVIEWED, payload);
}

module.exports = {
  CLAIM_EVENTS,
  emitClaimReviewed,
};
