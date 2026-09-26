import apiClient from "./client";

export async function getTransferValues() {
  const response = await apiClient.get(
    "/transfer-values",
  );

  return response.data;
}

export async function getTopTransferValues(
  limit = 10,
) {
  const response = await apiClient.get(
    "/transfer-values/top",
    {
      params: {
        limit,
      },
    },
  );

  return response.data;
}

export async function searchTransferValues(
  query,
) {
  const response = await apiClient.get(
    "/transfer-values/search",
    {
      params: {
        q: query,
      },
    },
  );

  return response.data;
}

export async function getMarketOpportunities(
  filters = {},
) {
  const response = await apiClient.get(
    "/transfer-values/opportunities",
    {
      params: filters,
    },
  );

  return response.data;
}

export async function getPlayerTransferValue(
  understatId,
) {
  const response = await apiClient.get(
    `/transfer-values/${understatId}`,
  );

  return response.data;
}

export async function getSimilarPlayers(
  understatId,
  limit = 10,
) {
  const response = await apiClient.get(
    `/transfer-values/${understatId}/similar`,
    {
      params: {
        limit,
      },
    },
  );

  return response.data;
}

