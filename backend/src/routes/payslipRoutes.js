const express = require("express");

const payslipController = require("../controllers/payslipController");
const { authorize, protect } = require("../middleware/authMiddleware");
const { validatePayslipUpload } = require("../middleware/validationMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.post("/", authorize(USER_ROLES.ADMIN, USER_ROLES.HR), validatePayslipUpload, payslipController.uploadPayslip);
router.get("/me", payslipController.getMyPayslips);
router.get("/", authorize(USER_ROLES.ADMIN, USER_ROLES.HR), payslipController.getAllPayslips);
router.get("/:id", payslipController.getPayslipById);

module.exports = router;
