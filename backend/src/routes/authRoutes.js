const express = require("express");

const authController = require("../controllers/authController");
const { optionalAuth, protect } = require("../middleware/authMiddleware");
const {
  validateLogin,
  validateRegister,
} = require("../middleware/validationMiddleware");

const router = express.Router();

router.post("/register", optionalAuth, validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.get("/me", protect, authController.getProfile);

module.exports = router;
