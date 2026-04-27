const express = require("express");

const meetingController = require("../controllers/meetingController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { validateMeetingCreation } = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post("/", validateMeetingCreation, meetingController.createMeeting);
router.get("/me", meetingController.getMyMeetings);
router.get("/", authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER), meetingController.getAllMeetings);

module.exports = router;
