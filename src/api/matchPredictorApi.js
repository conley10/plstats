import axios from "axios";

const MATCH_PREDICTOR_API_URL =
  import.meta.env.VITE_MATCH_PREDICTOR_API_URL ||
  "https://plstats-match-predictor.onrender.com";

const matchPredictorClient = axios.create({
  baseURL: MATCH_PREDICTOR_API_URL,
  timeout: 60000,
});

export async function getPredictorTeams() {
  const response = await matchPredictorClient.get(
    "/api/teams",
  );

  return response.data;
}

export async function predictMatch(
  homeTeam,
  awayTeam,
) {
  const response = await matchPredictorClient.post(
    "/api/match-predict",
    {
      home_team: homeTeam,
      away_team: awayTeam,
    },
  );

  return response.data;
}