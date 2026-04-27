const axios = require("axios");

const ApiError = require("../utils/apiError");

function getExternalApiConfig() {
  const apiKey = process.env.EXTERNAL_API_KEY;
  const baseURL = process.env.EXTERNAL_API_BASE_URL;

  if (!apiKey) {
    throw new ApiError(500, "External API key is not configured.");
  }

  if (!baseURL) {
    throw new ApiError(500, "External API base URL is not configured.");
  }

  return { apiKey, baseURL };
}

function buildClient() {
  const { apiKey, baseURL } = getExternalApiConfig();

  return axios.create({
    baseURL,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });
}

async function testConnection() {
  const client = buildClient();

  try {
    const response = await client.get("/test");
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new ApiError(
        error.response.status,
        error.response.data?.message || "External API returned an error."
      );
    }

    if (error.code === "ECONNABORTED") {
      throw new ApiError(504, "External API request timed out.");
    }

    throw new ApiError(502, "Unable to reach external API.");
  }
}

module.exports = {
  testConnection,
};
