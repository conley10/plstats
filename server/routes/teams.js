import express from "express";

import {
  getPremierLeagueMatches,
  getPremierLeagueScorers,
  getPremierLeagueStandings,
  getPremierLeagueTeams,
} from "../lib/footballData.js";

import {
  getCached,
  setCached,
} from "../lib/cache.js";

const router = express.Router();

function normaliseTeamName(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfc\b/gi, "")
    .replace(/\bafc\b/gi, "")
    .replace(/\bclub\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

function normaliseStandings(apiData) {
  const totalStandings = apiData.standings?.find(
    (standing) => standing.type === "TOTAL",
  );

  if (!totalStandings) {
    return [];
  }

  return totalStandings.table.map((entry) => ({
    id: entry.team.id,
    name: entry.team.name,
    shortName:
      entry.team.shortName ?? entry.team.name,
    tla: entry.team.tla ?? "",
    crest: entry.team.crest ?? null,

    position: entry.position,
    played: entry.playedGames,
    won: entry.won,
    drawn: entry.draw,
    lost: entry.lost,

    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference,

    points: entry.points,
    form: entry.form ?? "",
  }));
}

function matchBelongsToTeam(match, team) {
  if (
    match.homeTeam?.id === team.id ||
    match.awayTeam?.id === team.id
  ) {
    return true;
  }

  const teamName = normaliseTeamName(team.name);

  return (
    normaliseTeamName(match.homeTeam?.name) ===
      teamName ||
    normaliseTeamName(match.awayTeam?.name) ===
      teamName
  );
}

function getTeamResult(match, team) {
  const isHome =
    match.homeTeam?.id === team.id ||
    normaliseTeamName(match.homeTeam?.name) ===
      normaliseTeamName(team.name);

  const teamScore = isHome
    ? match.score?.fullTime?.home
    : match.score?.fullTime?.away;

  const opponentScore = isHome
    ? match.score?.fullTime?.away
    : match.score?.fullTime?.home;

  if (
    !Number.isFinite(teamScore) ||
    !Number.isFinite(opponentScore)
  ) {
    return null;
  }

  if (teamScore > opponentScore) {
    return "W";
  }

  if (teamScore < opponentScore) {
    return "L";
  }

  return "D";
}

function buildRecentForm(matches, team) {
  return matches
    .filter((match) =>
      matchBelongsToTeam(match, team),
    )
    .sort(
      (a, b) =>
        new Date(b.utcDate).getTime() -
        new Date(a.utcDate).getTime(),
    )
    .slice(0, 5)
    .reverse()
    .map((match) => getTeamResult(match, team))
    .filter(Boolean);
}

function normaliseMatch(match, team) {
  const isHome =
    match.homeTeam?.id === team.id ||
    normaliseTeamName(match.homeTeam?.name) ===
      normaliseTeamName(team.name);

  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    matchday: match.matchday ?? null,

    competition: {
      id: match.competition?.id ?? null,
      name: match.competition?.name ?? null,
      code: match.competition?.code ?? null,
      emblem: match.competition?.emblem ?? null,
    },

    venue: match.venue ?? null,

    homeTeam: {
      id: match.homeTeam?.id ?? null,
      name: match.homeTeam?.name ?? "Unknown",
      shortName:
        match.homeTeam?.shortName ??
        match.homeTeam?.name ??
        "Unknown",
      tla: match.homeTeam?.tla ?? "",
      crest: match.homeTeam?.crest ?? null,
    },

    awayTeam: {
      id: match.awayTeam?.id ?? null,
      name: match.awayTeam?.name ?? "Unknown",
      shortName:
        match.awayTeam?.shortName ??
        match.awayTeam?.name ??
        "Unknown",
      tla: match.awayTeam?.tla ?? "",
      crest: match.awayTeam?.crest ?? null,
    },

    score: {
      winner: match.score?.winner ?? null,

      fullTime: {
        home:
          match.score?.fullTime?.home ?? null,
        away:
          match.score?.fullTime?.away ?? null,
      },

      halfTime: {
        home:
          match.score?.halfTime?.home ?? null,
        away:
          match.score?.halfTime?.away ?? null,
      },
    },

    isHome,
    result: getTeamResult(match, team),
  };
}


function isMatchBetweenTeams(match, teamOneId, teamTwoId) {
  const homeTeamId = Number(match.homeTeam?.id);
  const awayTeamId = Number(match.awayTeam?.id);

  return (
    (homeTeamId === teamOneId && awayTeamId === teamTwoId) ||
    (homeTeamId === teamTwoId && awayTeamId === teamOneId)
  );
}

function normaliseHeadToHeadMatch(match) {
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    matchday: match.matchday ?? null,
    season: match.season?.startDate
      ? String(new Date(match.season.startDate).getUTCFullYear())
      : null,
    competition: {
      id: match.competition?.id ?? null,
      name: match.competition?.name ?? "Premier League",
      code: match.competition?.code ?? "PL",
      emblem: match.competition?.emblem ?? null,
    },
    homeTeam: {
      id: match.homeTeam?.id ?? null,
      name: match.homeTeam?.name ?? "Unknown",
      shortName:
        match.homeTeam?.shortName ??
        match.homeTeam?.name ??
        "Unknown",
      tla: match.homeTeam?.tla ?? "",
      crest: match.homeTeam?.crest ?? null,
    },
    awayTeam: {
      id: match.awayTeam?.id ?? null,
      name: match.awayTeam?.name ?? "Unknown",
      shortName:
        match.awayTeam?.shortName ??
        match.awayTeam?.name ??
        "Unknown",
      tla: match.awayTeam?.tla ?? "",
      crest: match.awayTeam?.crest ?? null,
    },
    score: {
      winner: match.score?.winner ?? null,
      fullTime: {
        home: match.score?.fullTime?.home ?? null,
        away: match.score?.fullTime?.away ?? null,
      },
      halfTime: {
        home: match.score?.halfTime?.home ?? null,
        away: match.score?.halfTime?.away ?? null,
      },
    },
  };
}

function buildHeadToHeadSummary(matches, teamOne) {
  const summary = {
    played: 0,
    teamOneWins: 0,
    draws: 0,
    teamTwoWins: 0,
    teamOneGoals: 0,
    teamTwoGoals: 0,
    biggestWin: null,
    latestMeeting: matches[0] ?? null,
  };

  for (const match of matches) {
    const homeScore = Number(match.score?.fullTime?.home);
    const awayScore = Number(match.score?.fullTime?.away);

    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      continue;
    }

    summary.played += 1;

    const teamOneIsHome = Number(match.homeTeam?.id) === teamOne.id;
    const teamOneScore = teamOneIsHome ? homeScore : awayScore;
    const teamTwoScore = teamOneIsHome ? awayScore : homeScore;

    summary.teamOneGoals += teamOneScore;
    summary.teamTwoGoals += teamTwoScore;

    if (teamOneScore > teamTwoScore) {
      summary.teamOneWins += 1;
    } else if (teamTwoScore > teamOneScore) {
      summary.teamTwoWins += 1;
    } else {
      summary.draws += 1;
    }

    const margin = Math.abs(homeScore - awayScore);

    if (
      margin > 0 &&
      (!summary.biggestWin || margin > summary.biggestWin.margin)
    ) {
      summary.biggestWin = {
        margin,
        match,
        winner:
          homeScore > awayScore ? match.homeTeam : match.awayTeam,
      };
    }
  }

  return summary;
}

function normaliseTeam(team) {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName ?? team.name,
    tla: team.tla ?? "",
    crest: team.crest ?? null,

    address: team.address ?? null,
    website: team.website ?? null,
    founded: team.founded ?? null,
    clubColors: team.clubColors ?? null,
    venue: team.venue ?? null,

    coach: team.coach
      ? {
          id: team.coach.id ?? null,
          firstName:
            team.coach.firstName ?? "",
          lastName:
            team.coach.lastName ?? "",
          name:
            team.coach.name ??
            [
              team.coach.firstName,
              team.coach.lastName,
            ]
              .filter(Boolean)
              .join(" "),
          dateOfBirth:
            team.coach.dateOfBirth ?? null,
          nationality:
            team.coach.nationality ?? null,
          contract: team.coach.contract ?? null,
        }
      : null,

    squad: (team.squad || []).map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position ?? "Unknown",
      dateOfBirth: player.dateOfBirth ?? null,
      nationality: player.nationality ?? null,
    })),
  };
}

function normaliseScorer(entry) {
  return {
    id: entry.player.id,
    name: entry.player.name,
    firstName: entry.player.firstName ?? "",
    lastName: entry.player.lastName ?? "",

    position:
      entry.player.position ?? "Unknown",

    nationality:
      entry.player.nationality ?? null,

    dateOfBirth:
      entry.player.dateOfBirth ?? null,

    appearances:
      entry.playedMatches ?? 0,

    goals:
      entry.goals ?? 0,

    assists:
      entry.assists ?? 0,

    penalties:
      entry.penalties ?? 0,

    team: {
      id: entry.team.id,
      name: entry.team.name,
      shortName:
        entry.team.shortName ??
        entry.team.name,
      crest: entry.team.crest ?? null,
    },
  };
}

/*
 * GET /api/teams
 *
 * Returns all Premier League clubs with their
 * current table record and recent form.
 */
router.get("/", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const cacheKey = `teams-${season}`;
    const cachedData = getCached(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const [
      standingsData,
      resultsData,
    ] = await Promise.all([
      getPremierLeagueStandings(season),

      getPremierLeagueMatches({
        season,
        status: "FINISHED",
      }),
    ]);

    const teams = normaliseStandings(
      standingsData,
    ).map((team) => ({
      ...team,

      recentForm: buildRecentForm(
        resultsData.matches || [],
        team,
      ),
    }));

    const responseData = {
      season,
      count: teams.length,
      teams,
    };

    setCached(
      cacheKey,
      responseData,
      15 * 60 * 1000,
    );

    return res.json(responseData);
  } catch (error) {
    console.error(
      "GET /api/teams failed:",
      error.response?.data ||
        error.message,
    );

    return res
      .status(error.response?.status || 500)
      .json({
        error:
          "Unable to load Premier League teams.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.response?.data ||
              error.message
            : undefined,
      });
  }
});


/*
 * GET /api/teams/:teamOneId/headtohead/:teamTwoId
 *
 * Returns recent completed Premier League meetings and an
 * all-meetings summary across the requested number of seasons.
 */
router.get(
  "/:teamOneId/headtohead/:teamTwoId",
  async (req, res) => {
    try {
      const currentSeason = Number(
        req.query.season ||
          process.env.FOOTBALL_DATA_SEASON ||
          "2026",
      );

      const teamOneId = Number(req.params.teamOneId);
      const teamTwoId = Number(req.params.teamTwoId);
      const requestedHistory = Number(req.query.history || 5);
      const requestedLimit = Number(req.query.limit || 5);

      if (
        !Number.isInteger(teamOneId) ||
        !Number.isInteger(teamTwoId) ||
        teamOneId === teamTwoId
      ) {
        return res.status(400).json({
          error: "Please provide two different valid team IDs.",
        });
      }

      if (!Number.isInteger(currentSeason)) {
        return res.status(400).json({
          error: "Invalid season.",
        });
      }

      const history = Math.min(
        Math.max(Number.isInteger(requestedHistory) ? requestedHistory : 5, 1),
        10,
      );

      const limit = Math.min(
        Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 5, 1),
        20,
      );

      const cacheKey =
        `team-h2h-${teamOneId}-${teamTwoId}-${currentSeason}-${history}-${limit}`;
      const cachedData = getCached(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const seasons = Array.from(
        { length: history },
        (_, index) => String(currentSeason - index),
      );

      const [teamsData, ...seasonResults] = await Promise.all([
        getPremierLeagueTeams(String(currentSeason)),
        ...seasons.map((season) =>
          getPremierLeagueMatches({
            season,
            status: "FINISHED",
          }).catch((error) => ({
            matches: [],
            unavailableSeason: season,
            error:
              error.response?.data?.message ||
              error.response?.data?.error ||
              error.message,
          })),
        ),
      ]);

      const rawTeams = teamsData.teams || [];
      const teamOneRaw = rawTeams.find((team) => team.id === teamOneId);
      const teamTwoRaw = rawTeams.find((team) => team.id === teamTwoId);

      if (!teamOneRaw || !teamTwoRaw) {
        return res.status(404).json({
          error: "One or both teams could not be found.",
        });
      }

      const teamOne = normaliseTeam(teamOneRaw);
      const teamTwo = normaliseTeam(teamTwoRaw);

      const unavailableSeasons = seasonResults
        .filter((result) => result.unavailableSeason)
        .map((result) => result.unavailableSeason);

      const allMeetings = seasonResults
        .flatMap((result) => result.matches || [])
        .filter((match) =>
          isMatchBetweenTeams(match, teamOneId, teamTwoId),
        )
        .sort(
          (a, b) =>
            new Date(b.utcDate).getTime() -
            new Date(a.utcDate).getTime(),
        )
        .map(normaliseHeadToHeadMatch);

      const summary = buildHeadToHeadSummary(
        allMeetings,
        teamOne,
        teamTwo,
      );

      const responseData = {
        season: String(currentSeason),
        seasonsRequested: seasons,
        unavailableSeasons,
        teamOne,
        teamTwo,
        summary,
        matches: allMeetings.slice(0, limit),
        totalMeetingsFound: allMeetings.length,
      };

      setCached(
        cacheKey,
        responseData,
        30 * 60 * 1000,
      );

      return res.json(responseData);
    } catch (error) {
      console.error(
        "GET /api/teams/:teamOneId/headtohead/:teamTwoId failed:",
        error.response?.data || error.message,
      );

      return res
        .status(error.response?.status || 500)
        .json({
          error: "Unable to load head-to-head history.",
          details:
            process.env.NODE_ENV === "development"
              ? error.response?.data || error.message
              : undefined,
        });
    }
  },
);

/*
 * GET /api/teams/:teamId
 *
 * Returns one team with:
 * - Club information
 * - League standing
 * - Squad
 * - Recent results
 * - Upcoming fixtures
 * - Top scorer
 * - Top assister
 */
router.get("/:teamId", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const teamId = Number(req.params.teamId);

    if (!Number.isInteger(teamId)) {
      return res.status(400).json({
        error: "Invalid team ID.",
      });
    }

    const cacheKey =
      `team-detail-${teamId}-${season}`;

    const cachedData = getCached(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const [
      teamsData,
      standingsData,
      finishedMatchesData,
      scheduledMatchesData,
      scorersData,
    ] = await Promise.all([
      getPremierLeagueTeams(season),

      getPremierLeagueStandings(season),

      getPremierLeagueMatches({
        season,
        status: "FINISHED",
      }),

      getPremierLeagueMatches({
        season,
        status: "SCHEDULED",
      }),

      getPremierLeagueScorers({
        season,
        limit: 500,
      }),
    ]);

    const rawTeam = (
      teamsData.teams || []
    ).find((team) => team.id === teamId);

    if (!rawTeam) {
      return res.status(404).json({
        error: "Team not found.",
      });
    }

    const team = normaliseTeam(rawTeam);

    const standing = normaliseStandings(
      standingsData,
    ).find((entry) => entry.id === teamId);

    const recentResults = (
      finishedMatchesData.matches || []
    )
      .filter((match) =>
        matchBelongsToTeam(match, team),
      )
      .sort(
        (a, b) =>
          new Date(b.utcDate).getTime() -
          new Date(a.utcDate).getTime(),
      )
      .slice(0, 5)
      .map((match) =>
        normaliseMatch(match, team),
      );

    const upcomingFixtures = (
      scheduledMatchesData.matches || []
    )
      .filter((match) =>
        matchBelongsToTeam(match, team),
      )
      .sort(
        (a, b) =>
          new Date(a.utcDate).getTime() -
          new Date(b.utcDate).getTime(),
      )
      .slice(0, 5)
      .map((match) =>
        normaliseMatch(match, team),
      );

    const teamScorers = (
      scorersData.scorers || []
    )
      .filter(
        (entry) => entry.team?.id === teamId,
      )
      .map(normaliseScorer);

    const topScorer =
      [...teamScorers].sort(
        (a, b) =>
          b.goals - a.goals ||
          b.assists - a.assists,
      )[0] ?? null;

    const topAssister =
      [...teamScorers].sort(
        (a, b) =>
          b.assists - a.assists ||
          b.goals - a.goals,
      )[0] ?? null;

    const responseData = {
      season,

      team,

      standing: standing ?? null,

      recentForm: standing
        ? buildRecentForm(
            finishedMatchesData.matches || [],
            standing,
          )
        : [],

      recentResults,
      upcomingFixtures,

      teamScorers,
      topScorer,
      topAssister,
    };

    setCached(
      cacheKey,
      responseData,
      15 * 60 * 1000,
    );

    return res.json(responseData);
  } catch (error) {
    console.error(
      "GET /api/teams/:teamId failed:",
      error.response?.data ||
        error.message,
    );

    return res
      .status(error.response?.status || 500)
      .json({
        error:
          "Unable to load team details.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.response?.data ||
              error.message
            : undefined,
      });
  }
});

export default router;