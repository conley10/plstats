import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getPremierLeagueScorers,
} from "../lib/footballData.js";

import {
  getCached,
  setCached,
} from "../lib/cache.js";

const router = express.Router();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const dataDirectory = path.resolve(
  currentDirectory,
  "../data",
);

function normaliseName(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normaliseTeamName(value = "") {
  return normaliseName(
    value
      .replace(/\bfc\b/gi, "")
      .replace(/\bafc\b/gi, "")
      .replace(/\bclub\b/gi, ""),
  );
}

function normaliseFootballDataPlayers(apiData) {
  return (apiData.scorers || []).map((entry) => ({
    id: entry.player.id,
    name: entry.player.name,

    firstName: entry.player.firstName ?? "",
    lastName: entry.player.lastName ?? "",

    dateOfBirth: entry.player.dateOfBirth ?? null,
    nationality: entry.player.nationality ?? null,
    position: entry.player.position ?? "Unknown",

    team: {
      id: entry.team.id,
      name: entry.team.name,
      shortName: entry.team.shortName ?? entry.team.name,
      crest: entry.team.crest ?? null,
    },

    appearances: entry.playedMatches ?? 0,
    goals: entry.goals ?? 0,
    assists: entry.assists ?? 0,
    penalties: entry.penalties ?? 0,

    understatId: null,
    minutes: null,
    shots: null,
    keyPasses: null,
    xg: null,
    xa: null,
    npxg: null,
    xgChain: null,
    xgBuildup: null,
  }));
}

async function readUnderstatPlayers(season) {
  const filePath = path.join(
    dataDirectory,
    `understat-players-${season}.json`,
  );

  try {
    const fileContents = await fs.readFile(
      filePath,
      "utf8",
    );

    const data = JSON.parse(fileContents);

    return data.players || [];
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(
        `Understat file does not exist for season ${season}.`,
      );

      return [];
    }

    throw error;
  }
}

async function getAvailableUnderstatSeasons() {
  try {
    const files = await fs.readdir(dataDirectory);

    return files
      .map((fileName) => {
        const match = fileName.match(
          /^understat-players-(\d{4})\.json$/,
        );

        return match ? Number(match[1]) : null;
      })
      .filter((season) => season !== null)
      .sort((a, b) => a - b);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function createSeasonLabel(season) {
  const nextYear = String(season + 1).slice(-2);

  return `${season}/${nextYear}`;
}

function findHistoricalUnderstatPlayer(
  currentPlayer,
  historicalPlayers,
) {
  if (currentPlayer.understatId) {
    const idMatch = historicalPlayers.find(
      (player) =>
        String(player.understatId) ===
        String(currentPlayer.understatId),
    );

    if (idMatch) {
      return idMatch;
    }
  }

  const currentName = normaliseName(currentPlayer.name);

  const nameMatches = historicalPlayers.filter(
    (player) =>
      normaliseName(player.name) === currentName,
  );

  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  return null;
}

function findUnderstatPlayer(
  footballPlayer,
  understatPlayers,
) {
  const footballName = normaliseName(
    footballPlayer.name,
  );

  const footballTeam = normaliseTeamName(
    footballPlayer.team.name,
  );

  const exactMatch = understatPlayers.find(
    (player) =>
      normaliseName(player.name) === footballName &&
      normaliseTeamName(player.team) === footballTeam,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const nameOnlyMatches = understatPlayers.filter(
    (player) =>
      normaliseName(player.name) === footballName,
  );

  if (nameOnlyMatches.length === 1) {
    return nameOnlyMatches[0];
  }

  return null;
}

function mergePlayers(
  footballPlayers,
  understatPlayers,
) {
  return footballPlayers.map((footballPlayer) => {
    const understatPlayer = findUnderstatPlayer(
      footballPlayer,
      understatPlayers,
    );

    if (!understatPlayer) {
      return footballPlayer;
    }

    return {
      ...footballPlayer,

      understatId: understatPlayer.understatId,

      position:
        footballPlayer.position === "Unknown"
          ? understatPlayer.position
          : footballPlayer.position,

      appearances:
        understatPlayer.appearances ??
        footballPlayer.appearances,

      minutes: understatPlayer.minutes,
      shots: understatPlayer.shots,
      keyPasses: understatPlayer.keyPasses,

      xg: understatPlayer.xg,
      xa: understatPlayer.xa,
      npxg: understatPlayer.npxg,

      xgChain: understatPlayer.xgChain,
      xgBuildup: understatPlayer.xgBuildup,
    };
  });
}

router.get("/", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2025";

    const limit = Math.min(
      Number.parseInt(req.query.limit, 10) || 100,
      500,
    );

    const cacheKey = `players-merged-${season}-${limit}`;
    const cachedData = getCached(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const [
      scorersData,
      understatPlayers,
    ] = await Promise.all([
      getPremierLeagueScorers({
        season,
        limit,
      }),

      readUnderstatPlayers(season),
    ]);

    const footballPlayers =
      normaliseFootballDataPlayers(scorersData);

    const players = mergePlayers(
      footballPlayers,
      understatPlayers,
    ).sort((a, b) => {
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }

      if (b.assists !== a.assists) {
        return b.assists - a.assists;
      }

      return a.name.localeCompare(b.name);
    });

    const matchedCount = players.filter(
      (player) => player.understatId,
    ).length;

    const responseData = {
      season,
      count: players.length,
      matchedCount,
      unmatchedCount:
        players.length - matchedCount,
      players,
    };

    setCached(
      cacheKey,
      responseData,
      30 * 60 * 1000,
    );

    return res.json(responseData);
  } catch (error) {
    console.error(
      "GET /api/players failed:",
      error.response?.data ||
      error.message,
    );

    return res
      .status(error.response?.status || 500)
      .json({
        error:
          "Unable to load Premier League players.",
        details:
          process.env.NODE_ENV === "development"
            ? error.response?.data ||
              error.message
            : undefined,
      });
  }
});

router.get("/:playerId/history", async (req, res) => {
  try {
    const currentSeason =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2025";

    const playerId = Number(req.params.playerId);

    if (!Number.isInteger(playerId)) {
      return res.status(400).json({
        error: "Invalid player ID.",
      });
    }

    const cacheKey =
      `player-history-${playerId}-${currentSeason}`;

    const cachedData = getCached(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    /*
     * First load the current player so we know their
     * football-data ID, name and Understat ID.
     */
    const [scorersData, currentUnderstatPlayers] =
      await Promise.all([
        getPremierLeagueScorers({
          season: currentSeason,
          limit: 500,
        }),
        readUnderstatPlayers(currentSeason),
      ]);

    const footballPlayers =
      normaliseFootballDataPlayers(scorersData);

    const currentPlayers = mergePlayers(
      footballPlayers,
      currentUnderstatPlayers,
    );

    const currentPlayer = currentPlayers.find(
      (player) => player.id === playerId,
    );

    if (!currentPlayer) {
      return res.status(404).json({
        error: "Player not found.",
      });
    }

    const availableSeasons =
      await getAvailableUnderstatSeasons();

    const historyResults = await Promise.all(
      availableSeasons.map(async (season) => {
        const historicalPlayers =
          await readUnderstatPlayers(season);

        const historicalPlayer =
          findHistoricalUnderstatPlayer(
            currentPlayer,
            historicalPlayers,
          );

        if (!historicalPlayer) {
          return null;
        }

        return {
          season,
          label: createSeasonLabel(season),

          team: historicalPlayer.team,
          position: historicalPlayer.position,

          appearances:
            historicalPlayer.appearances ?? 0,

          minutes:
            historicalPlayer.minutes ?? 0,

          goals:
            historicalPlayer.goals ?? 0,

          assists:
            historicalPlayer.assists ?? 0,

          shots:
            historicalPlayer.shots ?? 0,

          keyPasses:
            historicalPlayer.keyPasses ?? 0,

          xg:
            historicalPlayer.xg ?? 0,

          xa:
            historicalPlayer.xa ?? 0,

          npg:
            historicalPlayer.npg ?? 0,

          npxg:
            historicalPlayer.npxg ?? 0,

          xgChain:
            historicalPlayer.xgChain ?? 0,

          xgBuildup:
            historicalPlayer.xgBuildup ?? 0,

          yellowCards:
            historicalPlayer.yellowCards ?? 0,

          redCards:
            historicalPlayer.redCards ?? 0,
        };
      }),
    );

    const seasons = historyResults
      .filter(Boolean)
      .sort((a, b) => a.season - b.season);

    const careerTotals = seasons.reduce(
      (totals, season) => ({
        appearances:
          totals.appearances + season.appearances,

        minutes:
          totals.minutes + season.minutes,

        goals:
          totals.goals + season.goals,

        assists:
          totals.assists + season.assists,

        shots:
          totals.shots + season.shots,

        keyPasses:
          totals.keyPasses + season.keyPasses,

        xg:
          totals.xg + season.xg,

        xa:
          totals.xa + season.xa,

        npxg:
          totals.npxg + season.npxg,
      }),
      {
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        keyPasses: 0,
        xg: 0,
        xa: 0,
        npxg: 0,
      },
    );

    careerTotals.xg = Number(
      careerTotals.xg.toFixed(2),
    );

    careerTotals.xa = Number(
      careerTotals.xa.toFixed(2),
    );

    careerTotals.npxg = Number(
      careerTotals.npxg.toFixed(2),
    );

    const responseData = {
      player: {
        id: currentPlayer.id,
        name: currentPlayer.name,
        nationality: currentPlayer.nationality,
        position: currentPlayer.position,
        team: currentPlayer.team,
        understatId: currentPlayer.understatId,
      },

      seasonCount: seasons.length,
      firstSeason:
        seasons.length > 0 ? seasons[0].label : null,

      latestSeason:
        seasons.length > 0
          ? seasons[seasons.length - 1].label
          : null,

      careerTotals,
      seasons,
    };

    setCached(
      cacheKey,
      responseData,
      30 * 60 * 1000,
    );

    return res.json(responseData);
  } catch (error) {
    console.error(
      "GET /api/players/:playerId/history failed:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      error: "Unable to load player history.",
      details:
        process.env.NODE_ENV === "development"
          ? error.response?.data || error.message
          : undefined,
    });
  }
});

router.get("/:playerId", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const playerId = Number(req.params.playerId);

    const [scorersData, understatPlayers] =
      await Promise.all([
        getPremierLeagueScorers({
          season,
          limit: 500,
        }),
        readUnderstatPlayers(season),
      ]);

    const footballPlayers =
      normaliseFootballDataPlayers(scorersData);

    const players = mergePlayers(
      footballPlayers,
      understatPlayers
    );

    const player = players.find(
      (p) => p.id === playerId
    );

    if (!player) {
      return res.status(404).json({
        error: "Player not found",
      });
    }

    return res.json(player);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to load player.",
    });
  }
});

export default router;