const axios = require("axios");

const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

function getMapplsClient() {
  const apiKey = process.env.MAPPLS_API_KEY;
  const baseURL = process.env.MAPPLS_BASE_URL;

  if (!apiKey) {
    throw new ApiError(500, "Mappls API key is not configured.");
  }

  if (!baseURL) {
    throw new ApiError(500, "Mappls base URL is not configured.");
  }

  return axios.create({
    baseURL,
    timeout: 8000,
    headers: { "Content-Type": "application/json" },
  });
}

function validateCoordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ApiError(400, "lat must be a valid number between -90 and 90.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ApiError(400, "lng must be a valid number between -180 and 180.");
  }

  return { latitude, longitude };
}

function extractLocationData(responseData) {
  const result = Array.isArray(responseData?.results) ? responseData.results[0] : null;

  if (!result) {
    return null;
  }

  return {
    formattedAddress: result.formatted_address || "",
    poi: result.poi || "",
    street: result.street || "",
    locality: result.locality || result.subLocality || "",
    city: result.city || result.village || "",
    district: result.district || "",
    state: result.state || "",
    pincode: result.pincode || "",
  };
}

function handleMapplsError(error) {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error.response) {
    logger.warn("Mappls API returned an error response.", {
      status: error.response.status,
      data: error.response.data,
    });

    throw new ApiError(
      error.response.status >= 500 ? 502 : error.response.status,
      error.response.data?.message || "Mappls API returned an error."
    );
  }

  if (error.code === "ECONNABORTED") {
    logger.warn("Mappls API request timed out.");
    throw new ApiError(504, "Mappls API request timed out.");
  }

  logger.error("Mappls API network failure.", { message: error.message });
  throw new ApiError(502, "Unable to reach Mappls API.");
}

async function reverseGeocode(lat, lng) {
  const { latitude, longitude } = validateCoordinates(lat, lng);
  const client = getMapplsClient();

  try {
    const response = await client.get(
      `/advancedmaps/v1/${process.env.MAPPLS_API_KEY}/rev_geocode`,
      { params: { lat: latitude, lng: longitude } }
    );

    const location = extractLocationData(response.data);

    if (!location) {
      throw new ApiError(502, "Mappls API returned no results.");
    }

    return location;
  } catch (error) {
    handleMapplsError(error);
  }
}

module.exports = { reverseGeocode };
