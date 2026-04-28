const express = require("express");

const userController = require("../controllers/userController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateSetStatus,
  validateUserIdParam,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const { SUPER_ADMIN, ADMIN, HR, MANAGER } = USER_ROLES;

const router = express.Router();

router.use(protect);

// Self-service — no role restriction
router.get("/me",   userController.getMe);
router.patch("/me", userController.updateMe);

// Employee management
router.get(  "/",            authorize(SUPER_ADMIN, ADMIN, HR, MANAGER),  userController.listEmployees);
router.post( "/",            authorize(SUPER_ADMIN, ADMIN, HR),            validateRegister,   userController.createEmployee);
router.patch("/:id/status",  authorize(SUPER_ADMIN, ADMIN),                validateUserIdParam, validateSetStatus, userController.setStatus);

module.exports = router;
