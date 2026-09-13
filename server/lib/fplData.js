import axios from "axios";

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

const fplClient = axios.create({
  baseURL: FPL_BASE_URL,
  timeout: 15000,
  headers: {
    "User-Agent": "PLStats/1.0",
    Accept: "application/json",
  },
});

let bootstrapCache = null;
let bootstrapCacheTime = 0;

let fixturesCache = null;
let fixturesCacheTime = 0;

const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Fetch the main FPL bootstrap payload.
 *
 * Contains:
 * - players
 * - Premier League teams
 * - gameweeks
 * - positions
 * - FPL rules/settings
 */
export async function getFplBootstrap() {
  const now = Date.now();

  if (
    bootstrapCache &&
    now - bootstrapCacheTime < CACHE_DURATION
  ) {
    return bootstrapCache;
  }

  const response = await fplClient.get("/bootstrap-static/");

  bootstrapCache = response.data;
  bootstrapCacheTime = now;

  return response.data;
}

/**
 * Fetch every FPL fixture.
 */
export async function getFplFixtures() {
  const now = Date.now();

  if (
    fixturesCache &&
    now - fixturesCacheTime < CACHE_DURATION
  ) {
    return fixturesCache;
  }

  const response = await fplClient.get("/fixtures/");

  fixturesCache = response.data;
  fixturesCacheTime = now;

  return response.data;
}

/**
 * Fetch fixtures for one FPL gameweek.
 */
export async function getFplFixturesByGameweek(gameweek) {
  const response = await fplClient.get("/fixtures/", {
    params: {
      event: gameweek,
    },
  });

  return response.data;
}

/**
 * Fetch detailed history and upcoming fixtures
 * for an individual FPL player.
 */
export async function getFplPlayerSummary(playerId) {
  const response = await fplClient.get(
    `/element-summary/${playerId}/`,
  );

  return response.data;
}

/**
 * Fetch live statistics for a gameweek.
 */
export async function getFplLiveGameweek(gameweek) {
  const response = await fplClient.get(
    `/event/${gameweek}/live/`,
  );

  return response.data;
}

export default fplClient;