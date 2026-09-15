import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const dataDirectory = path.resolve(
  currentDirectory,
  "../data",
);

const understatPlayersCache = new Map();

let availableSeasonsCache = null;

export function normaliseName(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function normaliseTeamName(value = "") {
  return normaliseName(
    String(value)
      .replace(/\bfc\b/gi, "")
      .replace(/\bafc\b/gi, "")
      .replace(/\bclub\b/gi, ""),
  );
}

export async function readUnderstatPlayers(season) {
  const seasonKey = Number(season);

  if (understatPlayersCache.has(seasonKey)) {
    return understatPlayersCache.get(
      seasonKey,
    );
  }

  const filePath = path.join(
    dataDirectory,
    `understat-players-${seasonKey}.json`,
  );

  try {
    const fileContents = await fs.readFile(
      filePath,
      "utf8",
    );

    const data = JSON.parse(fileContents);

    const players = data.players || [];

    understatPlayersCache.set(
      seasonKey,
      players,
    );

    return players;
  } catch (error) {
    if (error.code === "ENOENT") {
      understatPlayersCache.set(
        seasonKey,
        [],
      );

      return [];
    }

    throw error;
  }
}

export async function getAvailableUnderstatSeasons() {
  if (availableSeasonsCache) {
    return availableSeasonsCache;
  }

  try {
    const files =
      await fs.readdir(dataDirectory);

    const seasons = files
      .map((fileName) => {
        const match = fileName.match(
          /^understat-players-(\d{4})\.json$/,
        );

        return match
          ? Number(match[1])
          : null;
      })
      .filter(
        (season) => season !== null,
      )
      .sort((a, b) => a - b);

    availableSeasonsCache = seasons;

    return seasons;
  } catch (error) {
    if (error.code === "ENOENT") {
      availableSeasonsCache = [];

      return [];
    }

    throw error;
  }
}

function playerNameVariants(player) {
  return [
    player.name,
    player.webName,
    `${player.firstName || ""} ${
      player.secondName || ""
    }`,
  ]
    .filter(Boolean)
    .map(normaliseName)
    .filter(Boolean);
}

export function findMatchingUnderstatPlayer(
  fplPlayer,
  understatPlayers,
) {
  const nameVariants =
    playerNameVariants(fplPlayer);

  const fplTeam = normaliseTeamName(
    fplPlayer.team?.name || "",
  );

  /*
   * First attempt:
   * exact player name + team.
   */
  const exactMatch = understatPlayers.find(
    (understatPlayer) => {
      const understatName = normaliseName(
        understatPlayer.name,
      );

      const understatTeam = normaliseTeamName(
        understatPlayer.team,
      );

      return (
        nameVariants.includes(understatName) &&
        (!fplTeam ||
          !understatTeam ||
          fplTeam === understatTeam)
      );
    },
  );

  if (exactMatch) {
    return exactMatch;
  }

  /*
   * Second attempt:
   * unique name match only.
   */
  const nameMatches =
    understatPlayers.filter(
      (understatPlayer) =>
        nameVariants.includes(
          normaliseName(
            understatPlayer.name,
          ),
        ),
    );

  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  return null;
}

export async function getHistoricalUnderstatData(
  fplPlayer,
  {
    seasonsBack = 3,
    currentSeason = 2026,
  } = {},
) {
  const availableSeasons =
    await getAvailableUnderstatSeasons();

  const relevantSeasons =
    availableSeasons
      .filter(
        (season) =>
          season <= currentSeason,
      )
      .slice(-seasonsBack);

  const results = [];

  for (const season of relevantSeasons) {
    const players =
      await readUnderstatPlayers(season);

    const match =
      findMatchingUnderstatPlayer(
        fplPlayer,
        players,
      );

    if (!match) {
      continue;
    }

    results.push({
      season,

      team:
        match.team || null,

      appearances:
        Number(
          match.appearances || 0,
        ),

      minutes:
        Number(match.minutes || 0),

      goals:
        Number(match.goals || 0),

      assists:
        Number(match.assists || 0),

      shots:
        Number(match.shots || 0),

      keyPasses:
        Number(
          match.keyPasses || 0,
        ),

      xg:
        Number(match.xg || 0),

      xa:
        Number(match.xa || 0),

      npxg:
        Number(match.npxg || 0),

      xgChain:
        Number(
          match.xgChain || 0,
        ),

      xgBuildup:
        Number(
          match.xgBuildup || 0,
        ),
    });
  }

  return results;
}

export function calculateHistoricalSummary(
  history = [],
) {
  const totals = history.reduce(
    (result, season) => ({
      appearances:
        result.appearances +
        season.appearances,

      minutes:
        result.minutes +
        season.minutes,

      goals:
        result.goals +
        season.goals,

      assists:
        result.assists +
        season.assists,

      shots:
        result.shots +
        season.shots,

      keyPasses:
        result.keyPasses +
        season.keyPasses,

      xg:
        result.xg +
        season.xg,

      xa:
        result.xa +
        season.xa,
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
    },
  );

  const per90 =
    totals.minutes > 0
      ? 90 / totals.minutes
      : 0;

  return {
    seasonCount: history.length,

    appearances:
      totals.appearances,

    minutes:
      totals.minutes,

    goals:
      totals.goals,

    assists:
      totals.assists,

    xg:
      Number(
        totals.xg.toFixed(2),
      ),

    xa:
      Number(
        totals.xa.toFixed(2),
      ),

    shots:
      totals.shots,

    keyPasses:
      totals.keyPasses,

    xgPer90: Number(
      (
        totals.xg * per90
      ).toFixed(3),
    ),

    xaPer90: Number(
      (
        totals.xa * per90
      ).toFixed(3),
    ),

    shotsPer90: Number(
      (
        totals.shots * per90
      ).toFixed(2),
    ),

    keyPassesPer90: Number(
      (
        totals.keyPasses *
        per90
      ).toFixed(2),
    ),
  };
}