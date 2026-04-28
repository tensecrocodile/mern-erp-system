const GeoFence = require("../models/GeoFence");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { WORK_MODES } = require("../utils/constants");
const { calculateDistanceInMeters } = require("../utils/geo");
const logger = require("../utils/logger");

// ── Geometry helpers ───────────────────────────────────────────

function isPointInPolygon(point, polygonPoints) {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = polygonPoints[i].lng;
    const yi = polygonPoints[i].lat;
    const xj = polygonPoints[j].lng;
    const yj = polygonPoints[j].lat;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function formatGeoFenceMatch(geoFence, distanceInMeters) {
  return {
    fenceId: geoFence._id,
    fenceName: geoFence.name,
    distanceFromCenterMeters: Math.round(distanceInMeters),
  };
}

// ── Attendance validation (supports circle + polygon) ──────────

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

  let nearestCircle = null;
  let matchedGeoFence = null;

  for (const geoFence of geoFences) {
    if (geoFence.type === "polygon" && geoFence.polygon?.length >= 3) {
      if (isPointInPolygon(location, geoFence.polygon)) {
        matchedGeoFence = { geoFence, distanceInMeters: 0 };
        break;
      }
      continue;
    }

    // Default: circle
    if (!geoFence.center?.latitude) continue;

    const distanceInMeters = calculateDistanceInMeters(location, {
      latitude: geoFence.center.latitude,
      longitude: geoFence.center.longitude,
    });
    const candidate = { geoFence, distanceInMeters };

    if (!nearestCircle || distanceInMeters < nearestCircle.distanceInMeters) {
      nearestCircle = candidate;
    }

    if (distanceInMeters <= geoFence.radius) {
      if (!matchedGeoFence || distanceInMeters < matchedGeoFence.distanceInMeters) {
        matchedGeoFence = candidate;
      }
    }
  }

  if (matchedGeoFence) {
    return formatGeoFenceMatch(matchedGeoFence.geoFence, matchedGeoFence.distanceInMeters);
  }

  if (nearestCircle) {
    logger.warn("Geo-fence check-in rejected.", {
      userId: user._id?.toString() ?? "unknown",
      nearestFence: nearestCircle.geoFence.name,
      distanceFromCenterMeters: Math.round(nearestCircle.distanceInMeters),
      allowedRadiusMeters: nearestCircle.geoFence.radius,
    });

    throw new ApiError(
      403,
      `Check-in rejected. You are outside the assigned geo-fence by ${Math.max(
        0,
        Math.round(nearestCircle.distanceInMeters - nearestCircle.geoFence.radius)
      )} meters.`,
      [
        { field: "location", message: "Current location is outside all assigned geo-fences." },
        { field: "nearestGeoFence", message: nearestCircle.geoFence.name },
        { field: "distanceFromCenterMeters", message: String(Math.round(nearestCircle.distanceInMeters)) },
        { field: "allowedRadiusInMeters", message: String(Math.round(nearestCircle.geoFence.radius)) },
      ]
    );
  }

  throw new ApiError(403, "Your location does not fall within any assigned geo-fence.");
}

// ── CRUD ───────────────────────────────────────────────────────

function validateCirclePayload(data) {
  const lat = Number(data.center?.latitude);
  const lng = Number(data.center?.longitude);
  const radius = Number(data.radius);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ApiError(400, "Circle center latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, "Circle center longitude must be between -180 and 180.");
  }
  if (!Number.isFinite(radius) || radius < 1 || radius > 50000) {
    throw new ApiError(400, "Circle radius must be between 1 and 50000 meters.");
  }

  return { lat, lng, radius };
}

function validatePolygonPayload(data) {
  if (!Array.isArray(data.polygon) || data.polygon.length < 3) {
    throw new ApiError(400, "Polygon must have at least 3 coordinate points.");
  }
  if (data.polygon.length > 500) {
    throw new ApiError(400, "Polygon cannot have more than 500 points.");
  }

  return data.polygon.map((pt, i) => {
    const lat = Number(pt.lat);
    const lng = Number(pt.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, `Polygon point [${i}]: lat must be between -90 and 90.`);
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, `Polygon point [${i}]: lng must be between -180 and 180.`);
    }
    return { lat, lng };
  });
}

async function createGeofence(data, createdById) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 120) {
    throw new ApiError(400, "Fence name is required and must be at most 120 characters.");
  }

  const type = data.type === "polygon" ? "polygon" : "circle";
  const doc = {
    name,
    type,
    companyId: data.companyId || null,
    createdBy: createdById,
    description: typeof data.description === "string" ? data.description.trim().slice(0, 300) : "",
    color: typeof data.color === "string" && data.color.trim() ? data.color.trim().slice(0, 20) : "#6366f1",
    isActive: data.isActive !== false,
  };

  if (type === "circle") {
    const { lat, lng, radius } = validateCirclePayload(data);
    doc.center = { latitude: lat, longitude: lng };
    doc.radius = radius;
    doc.polygon = [];
  } else {
    doc.polygon = validatePolygonPayload(data);
    doc.center = { latitude: null, longitude: null };
    doc.radius = null;
  }

  const fence = await GeoFence.create(doc);

  logger.info("Geofence created.", {
    fenceId: fence._id.toString(),
    name: fence.name,
    type: fence.type,
    createdBy: createdById?.toString(),
  });

  return fence.toJSON();
}

async function getGeofences(filters = {}) {
  const query = {};

  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.type) query.type = filters.type;
  if (filters.isActive !== undefined) query.isActive = filters.isActive === "true" || filters.isActive === true;

  const fences = await GeoFence.find(query)
    .populate("createdBy", "fullName email role")
    .populate("assignedTo", "fullName email role isActive")
    .sort({ createdAt: -1 })
    .lean();

  return fences;
}

async function getMyGeofences(user) {
  if (!Array.isArray(user.assignedGeoFences) || user.assignedGeoFences.length === 0) {
    return [];
  }

  const fences = await GeoFence.find({
    _id: { $in: user.assignedGeoFences },
    isActive: true,
  })
    .select("name type center radius polygon color description")
    .lean();

  return fences;
}

async function getGeofenceById(id) {
  const fence = await GeoFence.findById(id).populate("createdBy", "fullName email role").lean();
  if (!fence) throw new ApiError(404, "Geofence not found.");
  return fence;
}

async function updateGeofence(id, data) {
  const fence = await GeoFence.findById(id);
  if (!fence) throw new ApiError(404, "Geofence not found.");

  if (data.name !== undefined) {
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name || name.length > 120) throw new ApiError(400, "Fence name must be 1–120 characters.");
    fence.name = name;
  }

  if (data.description !== undefined) {
    fence.description = typeof data.description === "string" ? data.description.trim().slice(0, 300) : "";
  }

  if (data.color !== undefined && typeof data.color === "string" && data.color.trim()) {
    fence.color = data.color.trim().slice(0, 20);
  }

  if (data.isActive !== undefined) {
    fence.isActive = Boolean(data.isActive);
  }

  // Allow updating geometry only for the same type
  if (fence.type === "circle") {
    if (data.radius !== undefined) {
      const radius = Number(data.radius);
      if (!Number.isFinite(radius) || radius < 1 || radius > 50000) {
        throw new ApiError(400, "Circle radius must be between 1 and 50000 meters.");
      }
      fence.radius = radius;
    }
    if (data.center !== undefined) {
      const { lat, lng } = validateCirclePayload(data);
      fence.center = { latitude: lat, longitude: lng };
    }
  } else if (fence.type === "polygon" && data.polygon !== undefined) {
    fence.polygon = validatePolygonPayload(data);
  }

  await fence.save();

  logger.info("Geofence updated.", { fenceId: fence._id.toString(), name: fence.name });

  return fence.toJSON();
}

async function deleteGeofence(id) {
  const fence = await GeoFence.findByIdAndDelete(id);
  if (!fence) throw new ApiError(404, "Geofence not found.");

  logger.info("Geofence deleted.", { fenceId: id, name: fence.name });
}

async function assignUsers(fenceId, userIds) {
  const fence = await GeoFence.findById(fenceId);
  if (!fence) throw new ApiError(404, "Geofence not found.");

  // Validate every supplied ID resolves to a real user
  const validUsers = await User.find({ _id: { $in: userIds } })
    .select("_id companyId")
    .lean();

  if (validUsers.length !== userIds.length) {
    throw new ApiError(400, "One or more user IDs are invalid.");
  }

  // Company isolation: when the fence belongs to a company, all users must match
  if (fence.companyId) {
    const mismatch = validUsers.filter(
      (u) => u.companyId && String(u.companyId) !== String(fence.companyId)
    );
    if (mismatch.length > 0) {
      throw new ApiError(403, "All assigned users must belong to the same company as the geofence.");
    }
  }

  // Replace assignedTo list on the fence
  fence.assignedTo = userIds;
  await fence.save();

  // Keep User.assignedGeoFences in sync (used by check-in validation)
  await User.updateMany(
    { assignedGeoFences: fence._id },
    { $pull: { assignedGeoFences: fence._id } }
  );
  if (userIds.length > 0) {
    await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { assignedGeoFences: fence._id } }
    );
  }

  logger.info("Geofence users assigned.", {
    fenceId: fence._id.toString(),
    userCount: userIds.length,
  });

  const populated = await GeoFence.findById(fence._id)
    .populate("assignedTo", "fullName email role isActive")
    .lean();

  return populated;
}

module.exports = {
  assignUsers,
  createGeofence,
  deleteGeofence,
  getGeofenceById,
  getGeofences,
  getMyGeofences,
  updateGeofence,
  validateCheckInAgainstGeoFences,
};
