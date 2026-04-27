const express = require("express");

const mapplsController = require("../controllers/mapplsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/location-info", mapplsController.getLocationInfo);

module.exports = router;
