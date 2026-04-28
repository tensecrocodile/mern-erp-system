const claimService = require("../services/claimService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.submitClaim = asyncHandler(async (req, res) => {
  const claim = await claimService.createClaim(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Claim submitted successfully.",
    data: { claim },
  });
});

exports.getMyClaims = asyncHandler(async (req, res) => {
  const claims = await claimService.getUserClaims(req.user._id);
  return sendSuccess(res, {
    message: "My claims fetched successfully.",
    data: { claims },
  });
});

exports.getAllClaims = asyncHandler(async (req, res) => {
  const claims = await claimService.getAllClaims(req.user._id, req.user.role, {
    status: req.query.status,
    date:   req.query.date,
  });
  return sendSuccess(res, {
    message: "Claims fetched successfully.",
    data: { claims },
  });
});

exports.reviewClaim = asyncHandler(async (req, res) => {
  const claim = await claimService.reviewClaim(
    req.user._id,
    req.params.id,
    req.body.action,
    req.body.comment
  );
  return sendSuccess(res, {
    message: "Claim reviewed successfully.",
    data: { claim },
  });
});
