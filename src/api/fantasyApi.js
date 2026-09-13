import apiClient from "./client";

export async function getFantasyOverview() {
  const response =
    await apiClient.get(
      "/fantasy/overview",
    );

  return response.data;
}

export async function getFantasyPlayers({
  search,
  position,
  team,
  sort,
  limit,
} = {}) {
  const response =
    await apiClient.get(
      "/fantasy/players",
      {
        params: {
          search,
          position,
          team,
          sort,
          limit,
        },
      },
    );

  return response.data;
}

export async function getFantasyPlayer(
  playerId,
) {
  const response =
    await apiClient.get(
      `/fantasy/players/${playerId}`,
    );

  return response.data;
}

export async function getFantasyFixtures(
  gameweek,
) {
  const response =
    await apiClient.get(
      "/fantasy/fixtures",
      {
        params: {
          gameweek,
        },
      },
    );

  return response.data;
}

export async function getCurrentFantasyGameweek() {
  const response =
    await apiClient.get(
      "/fantasy/gameweeks/current",
    );

  return response.data;
}

export async function getFantasyPredictions({
  limit = 700,
} = {}) {
  const response =
    await apiClient.get(
      "/fantasy/predictions",
      {
        params: {
          limit,
        },
      },
    );

  return response.data;
}

export async function getFantasySquadRules() {
  const response =
    await apiClient.get(
      "/fantasy/squad/rules",
    );

  return response.data;
}

export async function validateFantasySquad(
  playerIds,
) {
  const response =
    await apiClient.post(
      "/fantasy/squad/validate",
      {
        playerIds,
      },
    );

  return response.data;
}

export async function analyseFantasySquad(
  playerIds,
) {
  const response =
    await apiClient.post(
      "/fantasy/squad/analyse",
      {
        playerIds,
      },
    );

  return response.data;
}

export async function getFantasyTransferRecommendations({
  playerIds,
  outgoingPlayerId,
  horizon = 1,
  limit = 10,
}) {
  const response =
    await apiClient.post(
      "/fantasy/transfers/recommend",
      {
        playerIds,

        outgoingPlayerId,

        horizon,

        limit,
      },
    );

  return response.data;
}

export async function optimiseFantasyMultiTransfers({
  playerIds,
  horizon = 3,
  limit = 5,
}) {
  const response =
    await apiClient.post(
      "/fantasy/multi-transfers/optimise",
      {
        playerIds,
        horizon,
        limit,
      },
    );

  return response.data;
}