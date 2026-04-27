const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { USER_ROLES, WORK_MODES } = require("../utils/constants");
const { generateAccessToken } = require("../utils/jwt");
const logger = require("../utils/logger");

function normalizeRegistrationPayload(payload) {
  return {
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    employeeId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : undefined,
    role: payload.role || USER_ROLES.EMPLOYEE,
    workMode: payload.workMode || WORK_MODES.FIELD,
    assignedGeoFences: Array.isArray(payload.assignedGeoFences) ? payload.assignedGeoFences : [],
  };
}

function resolveRoleForRegistration({ requester, requestedRole, existingUserCount }) {
  if (existingUserCount === 0) {
    return USER_ROLES.ADMIN;
  }

  if (!requester) {
    throw new ApiError(403, "Registration is restricted to authenticated admins or HR users.");
  }

  if (![USER_ROLES.ADMIN, USER_ROLES.HR].includes(requester.role)) {
    throw new ApiError(403, "You do not have permission to register new users.");
  }

  if (requester.role === USER_ROLES.HR && requestedRole !== USER_ROLES.EMPLOYEE) {
    throw new ApiError(403, "HR users can only create employee accounts.");
  }

  return requestedRole;
}

async function ensureUniqueUser({ email, employeeId }) {
  const lookupConditions = [{ email }];

  if (employeeId) {
    lookupConditions.push({ employeeId });
  }

  const existingUser = await User.findOne({ $or: lookupConditions });

  if (!existingUser) {
    return;
  }

  if (existingUser.email === email) {
    throw new ApiError(409, "A user with this email already exists.");
  }

  if (employeeId && existingUser.employeeId === employeeId) {
    throw new ApiError(409, "A user with this employee ID already exists.");
  }
}

async function registerUser({ requester, payload }) {
  const normalizedPayload = normalizeRegistrationPayload(payload);
  const existingUserCount = await User.countDocuments();
  const assignedRole = resolveRoleForRegistration({
    requester,
    requestedRole: normalizedPayload.role,
    existingUserCount,
  });

  await ensureUniqueUser({
    email: normalizedPayload.email,
    employeeId: normalizedPayload.employeeId,
  });

  const user = await User.create({
    ...normalizedPayload,
    role: assignedRole,
  });

  const response = {
    user: user.toJSON(),
  };

  if (!requester || existingUserCount === 0) {
    response.accessToken = generateAccessToken(user);
  }

  return response;
}

async function loginUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    logger.warn("Login failed: email not found.", { email });
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    logger.warn("Login failed: inactive account.", { userId: user._id.toString(), email });
    throw new ApiError(403, "This user account is inactive.");
  }

  const isPasswordValid = await user.comparePassword(payload.password);

  if (!isPasswordValid) {
    logger.warn("Login failed: incorrect password.", { userId: user._id.toString(), email });
    throw new ApiError(401, "Invalid email or password.");
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info("User logged in.", {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    accessToken: generateAccessToken(user),
    user: user.toJSON(),
  };
}

module.exports = {
  loginUser,
  registerUser,
};
