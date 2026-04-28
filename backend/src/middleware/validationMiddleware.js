const { body, param, query, validationResult } = require("express-validator");

const ApiError = require("../utils/apiError");
const {
  CLAIM_STATUS,
  CLAIM_TYPES,
  HOLIDAY_TYPES,
  LEAVE_STATUS,
  LEAVE_TYPES,
  USER_ROLES,
  WORK_MODES,
} = require("../utils/constants");

function makeValidator(chains) {
  return async (req, res, next) => {
    try {
      await Promise.all(chains.map((chain) => chain.run(req)));
      const result = validationResult(req);
      if (!result.isEmpty()) {
        return next(
          new ApiError(
            400,
            "Validation failed.",
            result.array({ onlyFirstError: true }).map((e) => ({
              field: e.path,
              message: e.msg,
            }))
          )
        );
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function locationChains(requireAccuracy = false) {
  const chains = [
    body("location")
      .exists({ values: "falsy" })
      .withMessage("location is required.")
      .bail()
      .isObject()
      .withMessage("location must be an object."),
    body("location.latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be a number between -90 and 90."),
    body("location.longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be a number between -180 and 180."),
  ];

  if (requireAccuracy) {
    chains.push(
      body("location.accuracy")
        .isFloat({ min: 0 })
        .withMessage("Accuracy must be a non-negative number.")
    );
  }

  return chains;
}

const validateRegister = makeValidator([
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Full name must be between 2 and 120 characters."),
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email address is required."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .bail()
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter.")
    .matches(/\d/)
    .withMessage("Password must contain a number."),
  body("role")
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(", ")}.`),
  body("workMode")
    .optional()
    .isIn(Object.values(WORK_MODES))
    .withMessage(`Work mode must be one of: ${Object.values(WORK_MODES).join(", ")}.`),
  body("employeeId")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 40 })
    .withMessage("Employee ID must be up to 40 characters."),
  body("assignedGeoFences")
    .optional()
    .isArray()
    .withMessage("assignedGeoFences must be an array.")
    .bail(),
  body("assignedGeoFences.*")
    .optional()
    .isMongoId()
    .withMessage("Each geo-fence ID must be a valid MongoDB ObjectId."),
]);

const validateLogin = makeValidator([
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email address is required."),
  body("password")
    .notEmpty()
    .withMessage("Password is required."),
]);

const validateCheckIn = makeValidator([
  ...locationChains(true),
  body("selfieUrl")
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("A valid selfie URL is required."),
  body("checkInAt")
    .optional()
    .isISO8601()
    .withMessage("checkInAt must be a valid ISO date string."),
]);

const validateCheckOut = makeValidator([
  ...locationChains(true),
  body("selfieUrl")
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("A valid selfie URL is required."),
  body("checkOutAt")
    .optional()
    .isISO8601()
    .withMessage("checkOutAt must be a valid ISO date string."),
]);

const validateTripStart = makeValidator([
  ...locationChains(true),
  body("startedAt")
    .optional()
    .isISO8601()
    .withMessage("startedAt must be a valid ISO date string."),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("notes must be a string up to 500 characters."),
]);

const validateTripLocationUpdate = makeValidator([
  ...locationChains(true),
  body("recordedAt")
    .optional()
    .isISO8601()
    .withMessage("recordedAt must be a valid ISO date string."),
]);

const validateTripEnd = makeValidator([
  ...locationChains(true),
  body("endedAt")
    .optional()
    .isISO8601()
    .withMessage("endedAt must be a valid ISO date string."),
]);

const validateTripIdParam = makeValidator([
  param("tripId")
    .isMongoId()
    .withMessage("tripId must be a valid MongoDB ObjectId."),
]);

const validateNotificationIdParam = makeValidator([
  param("id")
    .isMongoId()
    .withMessage("id must be a valid MongoDB ObjectId."),
]);

const validateClaimIdParam = makeValidator([
  param("id")
    .isMongoId()
    .withMessage("id must be a valid MongoDB ObjectId."),
]);

const validateClaimSubmission = makeValidator([
  body("type")
    .isIn(Object.values(CLAIM_TYPES))
    .withMessage(`type must be one of: ${Object.values(CLAIM_TYPES).join(", ")}.`),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount must be a positive number."),
  body("date")
    .isISO8601()
    .withMessage("date is required and must be a valid ISO date string."),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("description is required."),
  body("attachments")
    .optional()
    .isArray()
    .withMessage("attachments must be an array of URLs.")
    .bail(),
  body("attachments.*")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Each attachment must be a valid URL."),
]);

const validateClaimReview = makeValidator([
  body("action")
    .isIn(["approve", "reject"])
    .withMessage("action must be either 'approve' or 'reject'."),
  body("comment")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 500 })
    .withMessage("comment must be a string up to 500 characters."),
]);

const validateHolidayIdParam = makeValidator([
  param("id")
    .isMongoId()
    .withMessage("id must be a valid MongoDB ObjectId."),
]);

const validateHolidayCreation = makeValidator([
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name is required."),
  body("date")
    .isISO8601()
    .withMessage("date is required and must be a valid ISO date string."),
  body("type")
    .optional()
    .isIn(Object.values(HOLIDAY_TYPES))
    .withMessage(`type must be one of: ${Object.values(HOLIDAY_TYPES).join(", ")}.`),
  body("applicableTo")
    .custom((value) => {
      if (value === "all") return true;
      if (Array.isArray(value) && value.length > 0) return true;
      throw new Error("applicableTo must be 'all' or a non-empty array of user IDs.");
    }),
  body("applicableTo.*")
    .optional()
    .isMongoId()
    .withMessage("Each applicable user must be a valid MongoDB ObjectId."),
]);

const validateLeaveIdParam = makeValidator([
  param("id")
    .isMongoId()
    .withMessage("id must be a valid MongoDB ObjectId."),
]);

const validateLeaveSubmission = makeValidator([
  body("type")
    .isIn(Object.values(LEAVE_TYPES))
    .withMessage(`type must be one of: ${Object.values(LEAVE_TYPES).join(", ")}.`),
  body("startDate")
    .isISO8601()
    .withMessage("startDate is required and must be a valid ISO date string."),
  body("endDate")
    .isISO8601()
    .withMessage("endDate is required and must be a valid ISO date string.")
    .bail()
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error("endDate cannot be earlier than startDate.");
      }
      return true;
    }),
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("reason is required."),
]);

const validateLeaveReview = makeValidator([
  body("action")
    .isIn(["approve", "reject"])
    .withMessage("action must be either 'approve' or 'reject'."),
  body("comment")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 500 })
    .withMessage("comment must be a string up to 500 characters."),
]);

const validateMeetingCreation = makeValidator([
  body("clientName")
    .trim()
    .notEmpty()
    .withMessage("clientName is required.")
    .bail()
    .isLength({ max: 120 })
    .withMessage("clientName must be at most 120 characters."),
  body("purpose")
    .trim()
    .notEmpty()
    .withMessage("purpose is required.")
    .bail()
    .isLength({ max: 500 })
    .withMessage("purpose must be at most 500 characters."),
  body("notes")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 1000 })
    .withMessage("notes must be at most 1000 characters."),
  body("outcome")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 1000 })
    .withMessage("outcome must be at most 1000 characters."),
  body("location")
    .exists({ values: "falsy" })
    .withMessage("location is required.")
    .bail()
    .isObject()
    .withMessage("location must be an object."),
  body("location.lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("location.lat must be a number between -90 and 90."),
  body("location.lng")
    .isFloat({ min: -180, max: 180 })
    .withMessage("location.lng must be a number between -180 and 180."),
  body("nextActionDate")
    .optional()
    .isISO8601()
    .withMessage("nextActionDate must be a valid ISO date string."),
  body("tripId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("tripId must be a valid MongoDB ObjectId."),
]);

const validateDailyReportSubmission = makeValidator([
  body("workDate")
    .optional()
    .isISO8601()
    .withMessage("workDate must be a valid ISO date string."),
  body("plannedItems")
    .optional()
    .isArray()
    .withMessage("plannedItems must be an array."),
  body("plannedItems.*.description")
    .if(body("plannedItems").exists())
    .trim()
    .notEmpty()
    .withMessage("Each planned item must have a description.")
    .isLength({ max: 500 })
    .withMessage("Planned item description must be at most 500 characters."),
  body("activityItems")
    .optional()
    .isArray()
    .withMessage("activityItems must be an array."),
  body("activityItems.*.description")
    .if(body("activityItems").exists())
    .trim()
    .notEmpty()
    .withMessage("Each activity item must have a description.")
    .isLength({ max: 500 })
    .withMessage("Activity item description must be at most 500 characters."),
  body("notes")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 2000 })
    .withMessage("notes must be at most 2000 characters."),
]);

const validatePayslipUpload = makeValidator([
  body("userId")
    .isMongoId()
    .withMessage("userId must be a valid MongoDB ObjectId."),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage("month must be an integer between 1 and 12."),
  body("year")
    .isInt({ min: 2000 })
    .withMessage("year must be an integer >= 2000."),
  body("grossPay")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("grossPay must be a non-negative number."),
  body("netPay")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("netPay must be a non-negative number."),
  body("components")
    .optional()
    .isArray()
    .withMessage("components must be an array."),
  body("components.*.label")
    .if(body("components").exists())
    .trim()
    .notEmpty()
    .withMessage("Each component must have a label."),
  body("components.*.amount")
    .if(body("components").exists())
    .isNumeric()
    .withMessage("Each component must have a numeric amount."),
  body("components.*.type")
    .if(body("components").exists())
    .isIn(["earning", "deduction"])
    .withMessage("Component type must be earning or deduction."),
  body("fileUrl")
    .optional({ values: "falsy" })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("fileUrl must be a valid URL."),
]);

const validateGeofenceIdParam = makeValidator([
  param("id")
    .isMongoId()
    .withMessage("id must be a valid MongoDB ObjectId."),
]);

const validateTrackingUpdate = makeValidator([
  body("lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("lat must be a number between -90 and 90."),
  body("lng")
    .isFloat({ min: -180, max: 180 })
    .withMessage("lng must be a number between -180 and 180."),
  body("accuracy")
    .isFloat({ min: 0 })
    .withMessage("accuracy must be a non-negative number."),
  body("timestamp")
    .isISO8601()
    .withMessage("timestamp must be a valid ISO date string."),
  body("deviceId")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 200 })
    .withMessage("deviceId must be a string up to 200 characters."),
]);

const validateAttendanceIdParam = makeValidator([
  param("attendanceId")
    .isMongoId()
    .withMessage("attendanceId must be a valid MongoDB ObjectId."),
]);

const validateUserIdParam = makeValidator([
  param("id").isMongoId().withMessage("id must be a valid MongoDB ObjectId."),
]);

const validateSetStatus = makeValidator([
  body("isActive").isBoolean().withMessage("isActive must be true or false."),
]);

const validateAssignUsers = makeValidator([
  body("userIds")
    .isArray()
    .withMessage("userIds must be an array of MongoDB ObjectIds."),
  body("userIds.*")
    .isMongoId()
    .withMessage("Each entry in userIds must be a valid MongoDB ObjectId."),
]);

const validateAttendanceLogs = makeValidator([
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be an integer between 1 and 100."),
]);

const validateAttendanceSummary = makeValidator([
  query("month")
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("month must be in YYYY-MM format."),
]);

const validateGeofenceCreate = makeValidator([
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name is required.")
    .isLength({ max: 120 })
    .withMessage("name must be at most 120 characters."),
  body("type")
    .optional()
    .isIn(["circle", "polygon"])
    .withMessage("type must be circle or polygon."),
  body("color")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 20 })
    .withMessage("color must be a string up to 20 characters."),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 300 })
    .withMessage("description must be at most 300 characters."),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean."),
  body("companyId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("companyId must be a valid MongoDB ObjectId."),
  // Circle fields
  body("center.latitude")
    .if(body("type").equals("circle"))
    .isFloat({ min: -90, max: 90 })
    .withMessage("center.latitude must be between -90 and 90."),
  body("center.longitude")
    .if(body("type").equals("circle"))
    .isFloat({ min: -180, max: 180 })
    .withMessage("center.longitude must be between -180 and 180."),
  body("radius")
    .if(body("type").equals("circle"))
    .isFloat({ min: 1, max: 50000 })
    .withMessage("radius must be between 1 and 50000 meters."),
  // Polygon fields
  body("polygon")
    .if(body("type").equals("polygon"))
    .isArray({ min: 3 })
    .withMessage("polygon must be an array of at least 3 points."),
  body("polygon.*.lat")
    .if(body("type").equals("polygon"))
    .isFloat({ min: -90, max: 90 })
    .withMessage("Each polygon point lat must be between -90 and 90."),
  body("polygon.*.lng")
    .if(body("type").equals("polygon"))
    .isFloat({ min: -180, max: 180 })
    .withMessage("Each polygon point lng must be between -180 and 180."),
]);

const validateGeofenceUpdate = makeValidator([
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("name cannot be empty.")
    .isLength({ max: 120 })
    .withMessage("name must be at most 120 characters."),
  body("color")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 20 })
    .withMessage("color must be at most 20 characters."),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .isLength({ max: 300 })
    .withMessage("description must be at most 300 characters."),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean."),
  body("radius")
    .optional()
    .isFloat({ min: 1, max: 50000 })
    .withMessage("radius must be between 1 and 50000 meters."),
  body("center.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("center.latitude must be between -90 and 90."),
  body("center.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("center.longitude must be between -180 and 180."),
  body("polygon")
    .optional()
    .isArray({ min: 3 })
    .withMessage("polygon must have at least 3 points."),
  body("polygon.*.lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("polygon point lat must be between -90 and 90."),
  body("polygon.*.lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("polygon point lng must be between -180 and 180."),
]);

const validateAnnouncementCreation = makeValidator([
  body("title")
    .trim()
    .notEmpty()
    .withMessage("title is required.")
    .isLength({ max: 200 })
    .withMessage("title must be at most 200 characters."),
  body("body")
    .trim()
    .notEmpty()
    .withMessage("body is required.")
    .isLength({ max: 5000 })
    .withMessage("body must be at most 5000 characters."),
  body("targetAudience")
    .optional()
    .isIn(["all", "field", "office", "remote"])
    .withMessage("targetAudience must be all, field, office, or remote."),
  body("scheduledFor")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("scheduledFor must be a valid ISO date string."),
  body("attachmentUrl")
    .optional({ values: "falsy" })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("attachmentUrl must be a valid URL."),
  body("isDraft")
    .optional()
    .isBoolean()
    .withMessage("isDraft must be a boolean."),
]);

module.exports = {
  validateAnnouncementCreation,
  validateAssignUsers,
  validateAttendanceIdParam,
  validateAttendanceLogs,
  validateAttendanceSummary,
  validateSetStatus,
  validateTrackingUpdate,
  validateUserIdParam,
  validateCheckIn,
  validateCheckOut,
  validateClaimIdParam,
  validateClaimReview,
  validateClaimSubmission,
  validateDailyReportSubmission,
  validateGeofenceCreate,
  validateGeofenceIdParam,
  validateGeofenceUpdate,
  validateHolidayCreation,
  validateHolidayIdParam,
  validateLeaveIdParam,
  validateLeaveReview,
  validateLeaveSubmission,
  validateLogin,
  validateMeetingCreation,
  validateNotificationIdParam,
  validatePayslipUpload,
  validateRegister,
  validateTripEnd,
  validateTripIdParam,
  validateTripLocationUpdate,
  validateTripStart,
};
