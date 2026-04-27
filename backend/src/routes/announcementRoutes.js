const express = require("express");

const announcementController = require("../controllers/announcementController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { validateAnnouncementCreation } = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  authorize(USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER),
  validateAnnouncementCreation,
  announcementController.createAnnouncement
);
router.patch(
  "/:id/publish",
  authorize(USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER),
  announcementController.publishAnnouncement
);
router.get("/", announcementController.getAnnouncements);
router.get("/:id", announcementController.getAnnouncementById);
router.patch(
  "/:id",
  authorize(USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER),
  announcementController.updateAnnouncement
);
router.delete(
  "/:id",
  authorize(USER_ROLES.ADMIN),
  announcementController.deleteAnnouncement
);

module.exports = router;
