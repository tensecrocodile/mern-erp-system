const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.split(" ")[1];
}

async function resolveAuthenticatedUser(token) {
  const decodedToken = verifyAccessToken(token);
  const user = await User.findById(decodedToken.sub);

  if (!user || !user.isActive) {
    throw new ApiError(401, "Authentication failed. User is inactive or no longer exists.");
  }

  return user;
}

const protect = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new ApiError(401, "Authentication token is required.");
  }

  req.user = await resolveAuthenticatedUser(token);
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next();
  }

  req.user = await resolveAuthenticatedUser(token);
  return next();
});

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication token is required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action."));
    }

    return next();
  };
}

module.exports = {
  authorize,
  optionalAuth,
  protect,
};
