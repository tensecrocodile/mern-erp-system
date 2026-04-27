const express = require("express");

const externalApiController = require("../controllers/externalApiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/test", externalApiController.testConnection);

module.exports = router;
