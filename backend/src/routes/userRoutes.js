const express = require("express");

const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/me", userController.getMe);
router.patch("/me", userController.updateMe);

module.exports = router;
