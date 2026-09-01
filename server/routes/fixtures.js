import express from "express";

import { getPremierLeagueMatches } from "../lib/footballData.js";
import { getCached, setCached } from "../lib/cache.js";

const router = express.Router();

function normaliseTeam(team = {}) {
  return {
    id: team.id ?? null,
    name: team.name ?? "TBC",
    shortName: team.shortName ?? team.name ?? "TBC",
    tla: team.tla ?? "",
    crest: team.crest ?? null,
  };
}

function normaliseMatch(match) {
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    matchday: match.matchday ?? null,
    stage: match.stage ?? null,
    group: match.group ?? null,
    lastUpdated: match.lastUpdated ?? null,

    competition: {
      id: match.competition?.id ?? null,
      name: match.competition?.name ?? "Premier League",
      code: match.competition?.code ?? "PL",
      emblem: match.competition?.emblem ?? null,
    },

    homeTeam: normaliseTeam(match.homeTeam),
    awayTeam: normaliseTeam(match.awayTeam),

    score: {
      winner: match.score?.winner ?? null,
      duration: match.score?.duration ?? null,

      fullTime: {
        home: match.score?.fullTime?.home ?? null,
        away: match.score?.fullTime?.away ?? null,
      },

      halfTime: {
        home: match.score?.halfTime?.home ?? null,
        away: match.score?.halfTime?.away ?? null,
      },
    },

    referees: Array.isArray(match.referees)
      ? match.referees.map((referee) => ({
          id: referee.id ?? null,
          name: referee.name ?? null,
          type: referee.type ?? null,
          nationality: referee.nationality ?? null,
        }))
      : [],
  };
}

/*
 * GET /api/fixtures
 */
router.get("/", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const status = req.query.status
      ? String(req.query.status).toUpperCase()
      : undefined;

    const matchday = req.query.matchday
      ? Number(req.query.matchday)
      : undefined;

    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const cacheKey = [
      "fixtures",
      season,
      status || "ALL",
      matchday || "ALL",
      dateFrom || "ALL",
      dateTo || "ALL",
    ].join("-");

    const cached = getCached(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const data = await getPremierLeagueMatches({
      season,
      status,
      matchday,
      dateFrom,
      dateTo,
    });

    const fixtures = (data.matches || [])
      .map(normaliseMatch)
      .sort(
        (a, b) =>
          new Date(a.utcDate) -
          new Date(b.utcDate)
      );

    const response = {
      season,
      count: fixtures.length,
      fixtures,
    };

    setCached(cacheKey, response, 10 * 60 * 1000);

    res.json(response);
  } catch (error) {
    console.error(
      "GET /api/fixtures failed:",
      error.response?.data || error.message
    );

    res.status(error.response?.status || 500).json({
      error: "Unable to load Premier League fixtures.",
      details:
        process.env.NODE_ENV === "development"
          ? error.response?.data || error.message
          : undefined,
    });
  }
});

/*
 * GET /api/fixtures/:fixtureId
 */
router.get("/:fixtureId", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const fixtureId = Number(req.params.fixtureId);

    const cacheKey = `fixture-${fixtureId}-${season}`;

    const cached = getCached(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const data = await getPremierLeagueMatches({
      season,
    });

    const fixture = (data.matches || []).find(
      (match) => match.id === fixtureId
    );

    if (!fixture) {
      return res.status(404).json({
        error: "Fixture not found.",
      });
    }

    const response = normaliseMatch(fixture);

    setCached(cacheKey, response, 10 * 60 * 1000);

    res.json(response);
  } catch (error) {
    console.error(
      "GET /api/fixtures/:fixtureId failed:",
      error.response?.data || error.message
    );

    res.status(error.response?.status || 500).json({
      error: "Unable to load fixture.",
      details:
        process.env.NODE_ENV === "development"
          ? error.response?.data || error.message
          : undefined,
    });
  }
});

export default router;