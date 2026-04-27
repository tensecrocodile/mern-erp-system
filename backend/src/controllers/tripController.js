const tripService = require("../services/tripService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

exports.startTrip = asyncHandler(async (req, res) => {
  const { trip } = await tripService.startTrip({
    userId: req.user._id,
    payload: req.body,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "Trip started successfully.",
    data: {
      trip,
    },
  });
});

exports.updateTripLocation = asyncHandler(async (req, res) => {
  const { trip } = await tripService.updateTripLocation({
    tripId: req.params.tripId,
    userId: req.user._id,
    payload: req.body,
  });

  return sendSuccess(res, {
    message: "Trip location updated successfully.",
    data: {
      trip,
    },
  });
});

exports.endTrip = asyncHandler(async (req, res) => {
  const { trip } = await tripService.endTrip({
    tripId: req.params.tripId,
    userId: req.user._id,
    payload: req.body,
  });

  return sendSuccess(res, {
    message: "Trip ended successfully.",
    data: {
      trip,
    },
  });
});

exports.getActiveTripsFeed = asyncHandler(async (req, res) => {
  const trips = await tripService.getActiveTripsFeed();

  return sendSuccess(res, {
    message: "Active trips feed fetched successfully.",
    data: { trips },
  });
});
