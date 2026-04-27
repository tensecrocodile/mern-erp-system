const mapplsService = require("../services/mapplsService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { sendSuccess } = require("../utils/response");

exports.getLocationInfo = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (lat === undefined || lng === undefined) {
    throw new ApiError(400, "Query parameters lat and lng are required.");
  }

  const data = await mapplsService.reverseGeocode(lat, lng);

  return sendSuccess(res, {
    message: "Location fetched.",
    data,
  });
});
