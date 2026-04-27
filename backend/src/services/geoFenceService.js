const GeoFence = require("../models/GeoFence");
const ApiError = require("../utils/apiError");
const { WORK_MODES } = require("../utils/constants");
const { calculateDistanceInMeters } = require("../utils/geo");
const logger = require("../utils/logger");

function formatGeoFenceMatch(geoFence, distanceInMeters) {
  return {
    fenceId: geoFence._id,
    fenceName: geoFence.name,
    distanceFromCenterMeters: Math.round(distanceInMeters),
  };
}

async function validateCheckInAgainstGeoFences(user, location) {
  if (user.workMode !== WORK_MODES.OFFICE) {
    return null;
  }

  if (!Array.isArray(user.assignedGeoFences) || user.assignedGeoFences.length === 0) {
    throw new ApiError(403, "Office employees must have at least one assigned geo-fence before check-in.");
  }

  const geoFences = await GeoFence.find({
    _id: { $in: user.assignedGeoFences },
    isActive: true,
  }).lean();

  if (geoFences.length === 0) {
    throw new ApiError(403, "No active geo-fences are assigned to this office employee.");
  }

  let nearestGeoFence = null;
  let matchedGeoFence = null;

  for (const geoFence of geoFences) {
    const distanceInMeters = calculateDistanceInMeters(location, geoFence.center);
    const candidate = {
      geoFence,
      distanceInMeters,
    };

    if (!nearestGeoFence || candidate.distanceInMeters < nearestGeoFence.distanceInMeters) {
      nearestGeoFence = candidate;
    }

    if (
      distanceInMeters <= geoFence.radius &&
      (!matchedGeoFence || distanceInMeters < matchedGeoFence.distanceInMeters)
    ) {
      matchedGeoFence = candidate;
    }
  }

  if (matchedGeoFence) {
    return formatGeoFenceMatch(matchedGeoFence.geoFence, matchedGeoFence.distanceInMeters);
  }

  logger.warn("Geo-fence check-in rejected.", {
    userId: user._id ? user._id.toString() : "unknown",
    nearestFence: nearestGeoFence.geoFence.name,
    distanceFromCenterMeters: Math.round(nearestGeoFence.distanceInMeters),
    allowedRadiusMeters: nearestGeoFence.geoFence.radius,
  });

  throw new ApiError(
    403,
    `Check-in rejected. You are outside the assigned geo-fence radius by ${Math.max(
      0,
      Math.round(nearestGeoFence.distanceInMeters - nearestGeoFence.geoFence.radius)
    )} meters.`,
    [
      {
        field: "location",
        message: "Current location is outside all assigned geo-fences.",
      },
      {
        field: "nearestGeoFence",
        message: nearestGeoFence.geoFence.name,
      },
      {
        field: "distanceFromCenterMeters",
        message: String(Math.round(nearestGeoFence.distanceInMeters)),
      },
      {
        field: "allowedRadiusInMeters",
        message: String(Math.round(nearestGeoFence.geoFence.radius)),
      },
    ]
  );
}

module.exports = {
  validateCheckInAgainstGeoFences,
};
