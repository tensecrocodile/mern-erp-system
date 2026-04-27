const express = require("express");

const tripController = require("../controllers/tripController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateTripEnd,
  validateTripIdParam,
  validateTripLocationUpdate,
  validateTripStart,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.get("/live", authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER), tripController.getActiveTripsFeed);
router.post("/start", authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), validateTripStart, tripController.startTrip);
router.post("/:tripId/location", authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), validateTripIdParam, validateTripLocationUpdate, tripController.updateTripLocation);
router.post("/:tripId/end", authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE), validateTripIdParam, validateTripEnd, tripController.endTrip);

module.exports = router;
