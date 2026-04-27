const Trip = require("../models/Trip");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { ALERT_EVENT_TYPES, TRIP_IDLE_EVENT_STATUS, TRIP_STATUS } = require("../utils/constants");
const { calculateFastDistanceInMeters } = require("../utils/geo");
const logger = require("../utils/logger");
const { emitIdleAlert } = require("./tripAlertService");

const IDLE_RADIUS_METERS = 20;
const DEFAULT_IDLE_THRESHOLD_MINUTES = 5;

function getIdleThresholdMinutes() {
  const configuredValue = Number(process.env.TRIP_IDLE_THRESHOLD_MINUTES);

  if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
    return DEFAULT_IDLE_THRESHOLD_MINUTES;
  }

  return Math.round(configuredValue);
}

async function ensureActiveUser(userId) {
  const user = await User.findById(userId).select("_id isActive");

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Inactive users cannot manage trips.");
  }
}

function normalizeTimestamp(value, fieldName) {
  const parsedTime = value ? new Date(value) : new Date();

  if (Number.isNaN(parsedTime.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date.`);
  }

  return parsedTime;
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new ApiError(400, "Location payload is required.");
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ApiError(400, "Latitude must be a valid number between -90 and 90.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Longitude must be a valid number between -180 and 180.");
  }

  if (!Number.isFinite(accuracy) || accuracy < 0) {
    throw new ApiError(400, "Location accuracy must be a non-negative number.");
  }

  return {
    latitude,
    longitude,
    accuracy: Math.round(accuracy),
    address: typeof location.address === "string" ? location.address.trim() : "",
  };
}

function normalizeNotes(notes) {
  return typeof notes === "string" ? notes.trim() : "";
}

function buildRoutePoint({ recordedAt, location, distanceFromPreviousMeters = 0 }) {
  return {
    recordedAt,
    location,
    distanceFromPreviousMeters: Math.round(distanceFromPreviousMeters),
  };
}

function buildIdleCandidate({ recordedAt, location }) {
  return {
    anchorLocation: location,
    startedAt: recordedAt,
    lastSeenAt: recordedAt,
    maxDistanceMeters: 0,
  };
}

function calculateDurationMinutes(startTime, endTime) {
  return Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)));
}

function getActiveIdleEvent(trip) {
  if (!trip.trackingState || !trip.trackingState.activeIdleEventId) {
    return null;
  }

  return trip.idleEvents.id(trip.trackingState.activeIdleEventId) || null;
}

function closeActiveIdleEvent(trip, endedAt) {
  const activeIdleEvent = getActiveIdleEvent(trip);

  if (!activeIdleEvent) {
    return null;
  }

  activeIdleEvent.endedAt = endedAt;
  activeIdleEvent.durationMinutes = calculateDurationMinutes(activeIdleEvent.startedAt, endedAt);
  activeIdleEvent.status = TRIP_IDLE_EVENT_STATUS.RESOLVED;
  trip.trackingState.activeIdleEventId = null;

  return activeIdleEvent;
}

function createIdleAlertEvent({ idleEvent, recordedAt }) {
  return {
    type: ALERT_EVENT_TYPES.TRIP_IDLE_DETECTED,
    severity: "warning",
    createdAt: recordedAt,
    message: `Trip idle detected for more than ${idleEvent.thresholdMinutes} minutes within ${idleEvent.radiusMeters} meters.`,
    metadata: {
      idleEventId: idleEvent._id,
      radiusMeters: idleEvent.radiusMeters,
      thresholdMinutes: idleEvent.thresholdMinutes,
    },
  };
}

function processIdleDetection(trip, routePoint) {
  const idleThresholdMinutes = getIdleThresholdMinutes();
  const activeIdleEvent = getActiveIdleEvent(trip);
  const idleCandidate = trip.trackingState?.idleCandidate;

  if (!idleCandidate || !idleCandidate.anchorLocation || !idleCandidate.startedAt) {
    trip.trackingState.idleCandidate = buildIdleCandidate({
      recordedAt: routePoint.recordedAt,
      location: routePoint.location,
    });
    return null;
  }

  const distanceFromAnchor = calculateFastDistanceInMeters(routePoint.location, idleCandidate.anchorLocation);

  if (distanceFromAnchor <= IDLE_RADIUS_METERS) {
    idleCandidate.lastSeenAt = routePoint.recordedAt;
    idleCandidate.maxDistanceMeters = Math.max(idleCandidate.maxDistanceMeters || 0, distanceFromAnchor);

    if (activeIdleEvent) {
      activeIdleEvent.durationMinutes = calculateDurationMinutes(activeIdleEvent.startedAt, routePoint.recordedAt);
      activeIdleEvent.maxDistanceMeters = Math.max(
        activeIdleEvent.maxDistanceMeters || 0,
        Math.round(idleCandidate.maxDistanceMeters)
      );
      return null;
    }

    const idleDurationMinutes = calculateDurationMinutes(idleCandidate.startedAt, routePoint.recordedAt);

    if (idleDurationMinutes < idleThresholdMinutes) {
      return null;
    }

    trip.idleEvents.push({
      startedAt: idleCandidate.startedAt,
      endedAt: null,
      durationMinutes: idleDurationMinutes,
      anchorLocation: idleCandidate.anchorLocation,
      radiusMeters: IDLE_RADIUS_METERS,
      thresholdMinutes: idleThresholdMinutes,
      maxDistanceMeters: Math.round(idleCandidate.maxDistanceMeters),
      alertTriggeredAt: routePoint.recordedAt,
      status: TRIP_IDLE_EVENT_STATUS.ACTIVE,
    });

    const idleEvent = trip.idleEvents[trip.idleEvents.length - 1];
    trip.trackingState.activeIdleEventId = idleEvent._id;
    trip.alertEvents.push(createIdleAlertEvent({ idleEvent, recordedAt: routePoint.recordedAt }));

    logger.warn("Trip idle detected.", {
      tripId: trip._id.toString(),
      userId: trip.user.toString(),
      idleEventId: idleEvent._id.toString(),
      durationMinutes: idleEvent.durationMinutes,
    });

    return {
      eventName: "trip.idle.detected",
      tripId: trip._id.toString(),
      userId: trip.user.toString(),
      idleEventId: idleEvent._id.toString(),
      startedAt: idleEvent.startedAt.toISOString(),
      durationMinutes: idleEvent.durationMinutes,
      radiusMeters: idleEvent.radiusMeters,
      thresholdMinutes: idleEvent.thresholdMinutes,
    };
  }

  if (activeIdleEvent) {
    closeActiveIdleEvent(trip, routePoint.recordedAt);
  }

  trip.trackingState.idleCandidate = buildIdleCandidate({
    recordedAt: routePoint.recordedAt,
    location: routePoint.location,
  });

  return null;
}

function applyRoutePoint(trip, routePoint) {
  const lastLocation = trip.trackingState?.lastLocation;
  const distanceFromPreviousMeters = lastLocation
    ? calculateFastDistanceInMeters(lastLocation.location, routePoint.location)
    : 0;
  const normalizedRoutePoint = buildRoutePoint({
    recordedAt: routePoint.recordedAt,
    location: routePoint.location,
    distanceFromPreviousMeters,
  });
  const alertPayload = processIdleDetection(trip, normalizedRoutePoint);

  trip.routePoints.push(normalizedRoutePoint);
  trip.totalDistanceMeters += normalizedRoutePoint.distanceFromPreviousMeters;
  trip.trackingState.lastLocation = normalizedRoutePoint;

  return alertPayload;
}

function ensureChronologicalUpdate(trip, recordedAt) {
  const lastRecordedAt =
    trip.trackingState && trip.trackingState.lastLocation
      ? trip.trackingState.lastLocation.recordedAt
      : trip.startedAt;

  if (recordedAt <= lastRecordedAt) {
    throw new ApiError(400, "Trip updates must be recorded in chronological order.");
  }
}

async function findTripForUser({ tripId, userId }) {
  const trip = await Trip.findOne({
    _id: tripId,
    user: userId,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found.");
  }

  return trip;
}

async function startTrip({ userId, payload }) {
  await ensureActiveUser(userId);

  const existingActiveTrip = await Trip.findOne({
    user: userId,
    status: TRIP_STATUS.ACTIVE,
  }).select("_id");

  if (existingActiveTrip) {
    throw new ApiError(409, "You already have an active trip in progress.");
  }

  const startedAt = normalizeTimestamp(payload.startedAt, "startedAt");
  const location = normalizeLocation(payload.location);
  const initialPoint = buildRoutePoint({
    recordedAt: startedAt,
    location,
    distanceFromPreviousMeters: 0,
  });

  const trip = await Trip.create({
    user: userId,
    status: TRIP_STATUS.ACTIVE,
    startedAt,
    startLocation: location,
    endLocation: null,
    notes: normalizeNotes(payload.notes),
    routePoints: [initialPoint],
    totalDistanceMeters: 0,
    idleEvents: [],
    alertEvents: [],
    trackingState: {
      lastLocation: initialPoint,
      idleCandidate: buildIdleCandidate({
        recordedAt: startedAt,
        location,
      }),
      activeIdleEventId: null,
    },
  });

  logger.info("Trip started.", {
    tripId: trip._id.toString(),
    userId: userId.toString(),
    startedAt: trip.startedAt.toISOString(),
  });

  return {
    trip: trip.toJSON(),
  };
}

async function updateTripLocation({ tripId, userId, payload }) {
  await ensureActiveUser(userId);

  const trip = await findTripForUser({ tripId, userId });

  if (trip.status !== TRIP_STATUS.ACTIVE) {
    throw new ApiError(409, "Trip is no longer active.");
  }

  const recordedAt = normalizeTimestamp(payload.recordedAt, "recordedAt");
  const location = normalizeLocation(payload.location);

  ensureChronologicalUpdate(trip, recordedAt);

  const alertPayload = applyRoutePoint(trip, {
    recordedAt,
    location,
  });

  await trip.save();

  if (alertPayload) {
    emitIdleAlert(alertPayload);
  }

  return {
    trip: trip.toJSON(),
  };
}

async function endTrip({ tripId, userId, payload }) {
  await ensureActiveUser(userId);

  const trip = await findTripForUser({ tripId, userId });

  if (trip.status !== TRIP_STATUS.ACTIVE) {
    throw new ApiError(409, "Trip is already completed.");
  }

  const endedAt = normalizeTimestamp(payload.endedAt, "endedAt");
  const location = normalizeLocation(payload.location);

  ensureChronologicalUpdate(trip, endedAt);

  const alertPayload = applyRoutePoint(trip, {
    recordedAt: endedAt,
    location,
  });

  closeActiveIdleEvent(trip, endedAt);
  trip.endLocation = location;
  trip.endedAt = endedAt;
  trip.status = TRIP_STATUS.COMPLETED;
  trip.trackingState.idleCandidate = null;
  trip.trackingState.activeIdleEventId = null;

  await trip.save();

  logger.info("Trip ended.", {
    tripId: trip._id.toString(),
    userId: userId.toString(),
    endedAt: trip.endedAt.toISOString(),
    totalDistanceMeters: trip.totalDistanceMeters,
  });

  if (alertPayload) {
    emitIdleAlert(alertPayload);
  }

  return {
    trip: trip.toJSON(),
  };
}

async function getActiveTripsFeed() {
  const trips = await Trip.find(
    { status: TRIP_STATUS.ACTIVE },
    { user: 1, startedAt: 1, startLocation: 1, routePoints: { $slice: -1 } }
  )
    .populate("user", "fullName")
    .lean();

  return trips.map((trip) => {
    const lastPoint = trip.routePoints?.length > 0 ? trip.routePoints[0] : null;
    return {
      tripId: trip._id,
      userId: trip.user?._id ?? null,
      name: trip.user?.fullName ?? "Unknown",
      lat: lastPoint ? lastPoint.location.latitude : trip.startLocation.latitude,
      lng: lastPoint ? lastPoint.location.longitude : trip.startLocation.longitude,
      lastUpdatedAt: lastPoint ? lastPoint.recordedAt : trip.startedAt,
    };
  });
}

module.exports = {
  endTrip,
  getActiveTripsFeed,
  startTrip,
  updateTripLocation,
};
