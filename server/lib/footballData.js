import axios from "axios";

const footballDataClient = axios.create({
  baseURL: "https://api.football-data.org/v4",
  timeout: 10000,
  headers: {
    "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY,
  },
});

const defaultSeason = process.env.FOOTBALL_DATA_SEASON || "2026";

export async function getPremierLeagueStandings(
  season = defaultSeason,
) {
  const response = await footballDataClient.get(
    "/competitions/PL/standings",
    {
      params: {
        season,
      },
    },
  );

  return response.data;
}

export async function getPremierLeagueTeams(
  season = defaultSeason,
) {
  const response = await footballDataClient.get(
    "/competitions/PL/teams",
    {
      params: {
        season,
      },
    },
  );

  return response.data;
}

export async function getPremierLeagueMatches({
  season = defaultSeason,
  status,
  matchday,
  dateFrom,
  dateTo,
} = {}) {
  const params = {
    season,
  };

  if (status) {
    params.status = status;
  }

  if (matchday) {
    params.matchday = matchday;
  }

  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  if (dateTo) {
    params.dateTo = dateTo;
  }

  const response = await footballDataClient.get(
    "/competitions/PL/matches",
    {
      params,
    },
  );

  return response.data;
}

export async function getPremierLeagueScorers({
  season = defaultSeason,
  limit = 100,
} = {}) {
  const response = await footballDataClient.get(
    "/competitions/PL/scorers",
    {
      params: {
        season,
        limit,
      },
    },
  );

  return response.data;
}