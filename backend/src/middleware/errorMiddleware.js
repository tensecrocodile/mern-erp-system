const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

function buildDuplicateKeyError(error) {
  const duplicatedField = Object.keys(error.keyValue || {})[0];
  const duplicatedValue = duplicatedField ? error.keyValue[duplicatedField] : "value";

  return new ApiError(409, `The ${duplicatedField} '${duplicatedValue}' is already in use.`);
}

function buildValidationError(error) {
  const errors = Object.values(error.errors || {}).map((issue) => ({
    field: issue.path,
    message: issue.message,
  }));

  return new ApiError(400, "Validation failed.", errors);
}

function normalizeError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.name === "ValidationError") {
    return buildValidationError(error);
  }

  if (error.code === 11000) {
    return buildDuplicateKeyError(error);
  }

  if (error.name === "CastError") {
    return new ApiError(400, `Invalid value received for '${error.path}'.`);
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return new ApiError(401, "Invalid or expired authentication token.");
  }

  return new ApiError(500, error.message || "Internal server error.");
}

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  const normalizedError = normalizeError(error);
  const responseBody = {
    success: false,
    message: normalizedError.message,
    data: null,
  };

  if (normalizedError.errors && normalizedError.errors.length > 0) {
    responseBody.data = {
      errors: normalizedError.errors,
    };
  }

  if (normalizedError.statusCode >= 500) {
    logger.error("Unhandled application error.", {
      message: error.message,
      stack: error.stack,
    });
  }

  res.status(normalizedError.statusCode).json(responseBody);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
