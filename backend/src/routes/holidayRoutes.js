const express = require("express");

const holidayController = require("../controllers/holidayController");
const { authorize, protect } = require("../middleware/authMiddleware");
const {
  validateHolidayCreation,
  validateHolidayIdParam,
} = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post("/", authorize(USER_ROLES.ADMIN), validateHolidayCreation, holidayController.createHoliday);
router.get("/", authorize(USER_ROLES.ADMIN), holidayController.getAllHolidays);
router.get("/me", holidayController.getMyHolidays);
router.delete("/:id", authorize(USER_ROLES.ADMIN), validateHolidayIdParam, holidayController.deleteHoliday);

module.exports = router;
