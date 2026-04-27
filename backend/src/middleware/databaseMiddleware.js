const mongoose = require("mongoose");

const ApiError = require("../utils/apiError");

function requireDatabaseConnection(_req, _res, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(
      new ApiError(503, "Database connection is not available. Please try again once the service is ready.")
    );
  }

  return next();
}

module.exports = {
  requireDatabaseConnection,
};
