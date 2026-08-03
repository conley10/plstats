import apiClient from "./client";

export async function getPlayers({
  season,
  limit = 100,
} = {}) {
  const response = await apiClient.get("/players", {
    params: {
      season,
      limit,
    },
  });

  return response.data;
}

export async function getPlayer(playerId) {
  const response = await apiClient.get(
    `/players/${playerId}`
  );

  return response.data;
}

export async function getPlayerHistory(playerId) {
  const response = await apiClient.get(
    `/players/${playerId}/history`
  );

  return response.data;
}