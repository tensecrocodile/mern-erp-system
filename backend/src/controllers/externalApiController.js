const externalApiService = require("../services/externalApiService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.testConnection = asyncHandler(async (_req, res) => {
  const data = await externalApiService.testConnection();

  return sendSuccess(res, {
    message: "External API connection successful.",
    data,
  });
});
