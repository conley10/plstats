import express from "express";

import {
  getPremierLeagueMatches,
  getPremierLeagueScorers,
  getPremierLeagueStandings,
} from "../lib/footballData.js";

import {
  getCached,
  setCached,
} from "../lib/cache.js";

const router = express.Router();

function normaliseStandings(apiData) {
  const totalStandings = apiData.standings?.find(
    (standing) => standing.type === "TOTAL",
  );

  if (!totalStandings) {
    return [];
  }

  return totalStandings.table.map((entry) => ({
    id: entry.team.id,
    position: entry.position,
    team: entry.team.name,
    shortName: entry.team.shortName,
    crest: entry.team.crest,
    played: entry.playedGames,
    won: entry.won,
    drawn: entry.draw,
    lost: entry.lost,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference,
    points: entry.points,
    form: entry.form,
  }));
}

function normaliseMatches(apiData) {
  return (apiData.matches || []).map((match) => ({
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    matchday: match.matchday,

    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.name,
      shortName: match.homeTeam.shortName,
      crest: match.homeTeam.crest,
    },

    awayTeam: {
      id: match.awayTeam.id,
      name: match.awayTeam.name,
      shortName: match.awayTeam.shortName,
      crest: match.awayTeam.crest,
    },

    score: {
      home: match.score?.fullTime?.home ?? null,
      away: match.score?.fullTime?.away ?? null,
    },
  }));
}

function normaliseScorers(apiData) {
  return (apiData.scorers || []).map((entry) => ({
    id: entry.player.id,
    name: entry.player.name,
    team: entry.team.name,
    teamId: entry.team.id,
    goals: entry.goals ?? 0,
    assists: entry.assists ?? 0,
    penalties: entry.penalties ?? 0,
  }));
}

router.get("/", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const cacheKey = `home-${season}`;
    const cachedData = getCached(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const [
      standingsData,
      scheduledData,
      resultsData,
      scorersData,
    ] = await Promise.all([
      getPremierLeagueStandings(season),

      getPremierLeagueMatches({
        season,
        status: "SCHEDULED",
      }),

      getPremierLeagueMatches({
        season,
        status: "FINISHED",
      }),

      getPremierLeagueScorers({
        season,
        limit: 100,
      }),
    ]);

    const leagueTable = normaliseStandings(standingsData);

    const upcomingFixtures = normaliseMatches(scheduledData)
      .sort(
        (a, b) =>
          new Date(a.utcDate).getTime() -
          new Date(b.utcDate).getTime(),
      )
      .slice(0, 5);

    const recentResults = normaliseMatches(resultsData)
      .sort(
        (a, b) =>
          new Date(b.utcDate).getTime() -
          new Date(a.utcDate).getTime(),
      )
      .slice(0, 5);

    const allPlayerStats = normaliseScorers(scorersData);

    const topScorers = [...allPlayerStats]
      .sort((a, b) => {
        if (b.goals !== a.goals) {
          return b.goals - a.goals;
        }

        return b.assists - a.assists;
      })
      .slice(0, 5)
      .map((player) => ({
        ...player,
        value: player.goals,
      }));

    const topAssists = [...allPlayerStats]
      .filter((player) => player.assists > 0)
      .sort((a, b) => {
        if (b.assists !== a.assists) {
          return b.assists - a.assists;
        }

        return b.goals - a.goals;
      })
      .slice(0, 5)
      .map((player) => ({
        ...player,
        value: player.assists,
      }));

    const responseData = {
      season,
      leagueTable: leagueTable.slice(0, 8),
      upcomingFixtures,
      recentResults,
      topScorers,
      topAssists,

      // Understat data will be added here later.
      topPerformers: [],
    };

    setCached(
      cacheKey,
      responseData,
      15 * 60 * 1000,
    );

    return res.json(responseData);
  } catch (error) {
    console.error(
      "GET /api/home failed:",
      error.response?.data || error.message,
    );

    return res
      .status(error.response?.status || 500)
      .json({
        error: "Unable to load homepage statistics.",
        details:
          process.env.NODE_ENV === "development"
            ? error.response?.data || error.message
            : undefined,
      });
  }
});

export default router;