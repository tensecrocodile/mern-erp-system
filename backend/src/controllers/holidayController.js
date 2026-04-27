const holidayService = require("../services/holidayService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.createHoliday = asyncHandler(async (req, res) => {
  const holiday = await holidayService.createHoliday(req.user._id, req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Holiday created successfully.",
    data: {
      holiday,
    },
  });
});

exports.getAllHolidays = asyncHandler(async (req, res) => {
  const holidays = await holidayService.getAllHolidays({
    type: req.query.type,
    date: req.query.date,
  });

  return sendSuccess(res, {
    message: "Holidays fetched successfully.",
    data: {
      holidays,
    },
  });
});

exports.getMyHolidays = asyncHandler(async (req, res) => {
  const holidays = await holidayService.getUserHolidays(req.user._id);

  return sendSuccess(res, {
    message: "My holidays fetched successfully.",
    data: {
      holidays,
    },
  });
});

exports.deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await holidayService.deleteHoliday(req.params.id);

  return sendSuccess(res, {
    message: "Holiday deleted successfully.",
    data: {
      holiday,
    },
  });
});
