const jwt = require("jsonwebtoken");

const ApiError = require("./apiError");

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured.");
  }

  return process.env.JWT_SECRET;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
