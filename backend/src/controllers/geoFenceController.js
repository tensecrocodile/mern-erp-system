const geoFenceService = require("../services/geoFenceService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.getMyGeofences = asyncHandler(async (req, res) => {
  const geofences = await geoFenceService.getMyGeofences(req.user);

  return sendSuccess(res, {
    message: "Assigned geofences fetched successfully.",
    data: { geofences },
  });
});

exports.createGeofence = asyncHandler(async (req, res) => {
  const geofence = await geoFenceService.createGeofence(req.body, req.user._id);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Geofence created successfully.",
    data: { geofence },
  });
});

exports.getGeofences = asyncHandler(async (req, res) => {
  const geofences = await geoFenceService.getGeofences({
    companyId: req.query.companyId,
    type: req.query.type,
    isActive: req.query.isActive,
  });

  return sendSuccess(res, {
    message: "Geofences fetched successfully.",
    data: { geofences },
  });
});

exports.getGeofenceById = asyncHandler(async (req, res) => {
  const geofence = await geoFenceService.getGeofenceById(req.params.id);

  return sendSuccess(res, {
    message: "Geofence fetched successfully.",
    data: { geofence },
  });
});

exports.updateGeofence = asyncHandler(async (req, res) => {
  const geofence = await geoFenceService.updateGeofence(req.params.id, req.body);

  return sendSuccess(res, {
    message: "Geofence updated successfully.",
    data: { geofence },
  });
});

exports.deleteGeofence = asyncHandler(async (req, res) => {
  await geoFenceService.deleteGeofence(req.params.id);

  return sendSuccess(res, {
    message: "Geofence deleted successfully.",
    data: null,
  });
});

exports.assignUsers = asyncHandler(async (req, res) => {
  const geofence = await geoFenceService.assignUsers(
    req.params.id,
    req.body.userIds ?? []
  );

  return sendSuccess(res, {
    message: "Users assigned to geofence successfully.",
    data: { geofence },
  });
});
