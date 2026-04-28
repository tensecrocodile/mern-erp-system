const express = require("express");

const geoFenceController = require("../controllers/geoFenceController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/constants");
const {
  validateGeofenceCreate,
  validateGeofenceUpdate,
  validateGeofenceIdParam,
  validateAssignUsers,
} = require("../middleware/validationMiddleware");

const router = express.Router();

router.use(protect);

// Available to all authenticated users — returns the caller's own assigned geofences
router.get("/my", geoFenceController.getMyGeofences);

// Admin-only CRUD
const adminOnly = authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);
router.post("/",           adminOnly, validateGeofenceCreate,                          geoFenceController.createGeofence);
router.get("/",            adminOnly,                                                   geoFenceController.getGeofences);
router.get("/:id",         adminOnly, validateGeofenceIdParam,                         geoFenceController.getGeofenceById);
router.patch("/:id",       adminOnly, validateGeofenceIdParam, validateGeofenceUpdate, geoFenceController.updateGeofence);
router.delete("/:id",      adminOnly, validateGeofenceIdParam,                         geoFenceController.deleteGeofence);
router.post("/:id/assign", adminOnly, validateGeofenceIdParam, validateAssignUsers,    geoFenceController.assignUsers);

module.exports = router;
