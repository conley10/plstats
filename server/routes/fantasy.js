import express from "express";

import {
  getFplBootstrap,
  getFplFixtures,
  getFplFixturesByGameweek,
  getFplPlayerSummary,
} from "../lib/fplData.js";

import {
  readUnderstatPlayers,
  findMatchingUnderstatPlayer,
  getHistoricalUnderstatData,
  calculateHistoricalSummary,
} from "../lib/understatData.js";

import {
  createPlayerPrediction,
} from "../services/predictionService.js";

const router = express.Router();

const UNDERSTAT_CURRENT_SEASON =
  Number(
    process.env.FOOTBALL_DATA_SEASON ||
      2026,
  );

function numberOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getCurrentGameweek(
  events = [],
) {
  return (
    events.find(
      (event) =>
        event.is_current,
    ) ||
    events.find(
      (event) =>
        event.is_next,
    ) ||
    null
  );
}

function getNextGameweek(
  events = [],
) {
  return (
    events.find(
      (event) => event.is_next,
    ) || null
  );
}

function createTeamMap(teams = []) {
  return new Map(
    teams.map((team) => [
      team.id,
      {
        id: team.id,
        name: team.name,
        shortName:
          team.short_name,
        code: team.code,
        strength:
          team.strength,
      },
    ]),
  );
}

function createPositionMap(
  elementTypes = [],
) {
  return new Map(
    elementTypes.map(
      (position) => [
        position.id,
        {
          id: position.id,
          name:
            position.singular_name,
          shortName:
            position.singular_name_short,
        },
      ],
    ),
  );
}

function normaliseFplPlayer(
  player,
  teamMap,
  positionMap,
) {
  return {
    id: player.id,

    code: player.code,

    firstName:
      player.first_name,

    secondName:
      player.second_name,

    webName:
      player.web_name,

    name:
      `${player.first_name} ${player.second_name}`.trim(),

    team:
      teamMap.get(
        player.team,
      ) || null,

    position:
      positionMap.get(
        player.element_type,
      ) || null,

    price:
      numberOrZero(
        player.now_cost,
      ) / 10,

    totalPoints:
      numberOrZero(
        player.total_points,
      ),

    eventPoints:
      numberOrZero(
        player.event_points,
      ),

    pointsPerGame:
      numberOrZero(
        player.points_per_game,
      ),

    form:
      numberOrZero(
        player.form,
      ),

    selectedByPercent:
      numberOrZero(
        player.selected_by_percent,
      ),

    transfersIn:
      numberOrZero(
        player.transfers_in,
      ),

    transfersOut:
      numberOrZero(
        player.transfers_out,
      ),

    minutes:
      numberOrZero(
        player.minutes,
      ),

    goals:
      numberOrZero(
        player.goals_scored,
      ),

    assists:
      numberOrZero(
        player.assists,
      ),

    cleanSheets:
      numberOrZero(
        player.clean_sheets,
      ),

    bonus:
      numberOrZero(
        player.bonus,
      ),

    bps:
      numberOrZero(
        player.bps,
      ),

    influence:
      numberOrZero(
        player.influence,
      ),

    creativity:
      numberOrZero(
        player.creativity,
      ),

    threat:
      numberOrZero(
        player.threat,
      ),

    ictIndex:
      numberOrZero(
        player.ict_index,
      ),

    expectedGoals:
      numberOrZero(
        player.expected_goals,
      ),

    expectedAssists:
      numberOrZero(
        player.expected_assists,
      ),

    expectedGoalInvolvements:
      numberOrZero(
        player.expected_goal_involvements,
      ),

    expectedGoalsConceded:
      numberOrZero(
        player.expected_goals_conceded,
      ),

    expectedPoints:
      numberOrZero(
        player.ep_next,
      ),

    chanceOfPlayingNextRound:
      player.chance_of_playing_next_round,

    chanceOfPlayingThisRound:
      player.chance_of_playing_this_round,

    news:
      player.news || "",

    status:
      player.status,
  };
}

function findPlayerFixture(
  player,
  fixtures,
  gameweek,
) {
  const teamId =
    player.team?.id;

  if (!teamId) {
    return null;
  }

  const fixture =
    fixtures.find(
      (item) =>
        item.event ===
          gameweek &&
        (
          item.team_h === teamId ||
          item.team_a === teamId
        ),
    );

  if (!fixture) {
    return null;
  }

  const home =
    fixture.team_h === teamId;

  return {
    id: fixture.id,

    gameweek:
      fixture.event,

    kickoffTime:
      fixture.kickoff_time,

    home,

    opponentTeamId:
      home
        ? fixture.team_a
        : fixture.team_h,

    difficulty:
      home
        ? fixture.team_h_difficulty
        : fixture.team_a_difficulty,
  };
}

/*
 * -----------------------------------------------------
 * API INFORMATION
 * -----------------------------------------------------
 */

router.get(
  "/",
  async (req, res) => {
    try {
      const bootstrap =
        await getFplBootstrap();

      const currentGameweek =
        getCurrentGameweek(
          bootstrap.events,
        );

      const nextGameweek =
        getNextGameweek(
          bootstrap.events,
        );

      return res.json({
        status: "ok",

        service:
          "PLStats Fantasy API",

        playerCount:
          bootstrap.elements
            ?.length || 0,

        currentGameweek,

        nextGameweek,
      });
    } catch (error) {
      console.error(
        "GET /api/fantasy failed:",
        error.response?.data ||
          error.message,
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to connect to FPL.",
        });
    }
  },
);

/*
 * -----------------------------------------------------
 * OVERVIEW
 * -----------------------------------------------------
 */

router.get(
  "/overview",
  async (req, res) => {
    try {
      const bootstrap =
        await getFplBootstrap();

      return res.json({
        totalPlayers:
          bootstrap.elements
            .length,

        totalManagers:
          bootstrap.total_players,

        currentGameweek:
          getCurrentGameweek(
            bootstrap.events,
          ),

        nextGameweek:
          getNextGameweek(
            bootstrap.events,
          ),

        teams:
          bootstrap.teams.map(
            (team) => ({
              id: team.id,
              name: team.name,

              shortName:
                team.short_name,

              strength:
                team.strength,
            }),
          ),

        positions:
          bootstrap.element_types.map(
            (position) => ({
              id: position.id,

              name:
                position.singular_name,

              shortName:
                position.singular_name_short,
            }),
          ),
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            "Unable to load Fantasy overview.",
        });
    }
  },
);

/*
 * -----------------------------------------------------
 * STANDARD FPL PLAYER LIST
 * -----------------------------------------------------
 */

router.get(
  "/players",
  async (req, res) => {
    try {
      const bootstrap =
        await getFplBootstrap();

      const teamMap =
        createTeamMap(
          bootstrap.teams,
        );

      const positionMap =
        createPositionMap(
          bootstrap.element_types,
        );

      let players =
        bootstrap.elements.map(
          (player) =>
            normaliseFplPlayer(
              player,
              teamMap,
              positionMap,
            ),
        );

      const {
        search,
        position,
        team,
        sort = "points",
      } = req.query;

      const limit = Math.min(
        Number.parseInt(
          req.query.limit,
          10,
        ) || 700,
        700,
      );

      if (search) {
        const value =
          String(search)
            .toLowerCase()
            .trim();

        players =
          players.filter(
            (player) =>
              player.name
                .toLowerCase()
                .includes(value) ||
              player.webName
                .toLowerCase()
                .includes(value),
          );
      }

      if (position) {
        players =
          players.filter(
            (player) =>
              player.position
                ?.shortName ===
              String(
                position,
              ).toUpperCase(),
          );
      }

      if (team) {
        const value =
          String(team)
            .toLowerCase()
            .trim();

        players =
          players.filter(
            (player) =>
              player.team?.name
                ?.toLowerCase()
                .includes(value),
          );
      }

      switch (sort) {
        case "price":
          players.sort(
            (a, b) =>
              b.price -
              a.price,
          );
          break;

        case "form":
          players.sort(
            (a, b) =>
              b.form -
              a.form,
          );
          break;

        case "ownership":
          players.sort(
            (a, b) =>
              b.selectedByPercent -
              a.selectedByPercent,
          );
          break;

        case "expected":
          players.sort(
            (a, b) =>
              b.expectedPoints -
              a.expectedPoints,
          );
          break;

        default:
          players.sort(
            (a, b) =>
              b.totalPoints -
              a.totalPoints,
          );
      }

      players =
        players.slice(
          0,
          limit,
        );

      return res.json({
        count:
          players.length,

        players,
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            "Unable to load FPL players.",
        });
    }
  },
);

/*
 * -----------------------------------------------------
 * PLSTATS PREDICTIONS
 * -----------------------------------------------------
 */

router.get(
  "/predictions",
  async (req, res) => {
    try {
      const [
        bootstrap,
        fixtures,
        currentUnderstatPlayers,
      ] = await Promise.all([
        getFplBootstrap(),

        getFplFixtures(),

        readUnderstatPlayers(
          UNDERSTAT_CURRENT_SEASON,
        ),
      ]);

      const teamMap =
        createTeamMap(
          bootstrap.teams,
        );

      const positionMap =
        createPositionMap(
          bootstrap.element_types,
        );

      const nextGameweek =
        getNextGameweek(
          bootstrap.events,
        ) ||
        getCurrentGameweek(
          bootstrap.events,
        );

      if (!nextGameweek) {
        return res
          .status(404)
          .json({
            error:
              "No active gameweek found.",
          });
      }

      const limit =
        Math.min(
          Number.parseInt(
            req.query.limit,
            10,
          ) || 100,
          700,
        );

      const fplPlayers =
        bootstrap.elements.map(
          (rawPlayer) =>
            normaliseFplPlayer(
              rawPlayer,
              teamMap,
              positionMap,
            ),
        );

      const predictions = [];

      for (
        const player of fplPlayers
      ) {
        /*
         * Match current Understat data.
         */

        const currentUnderstat =
          findMatchingUnderstatPlayer(
            player,
            currentUnderstatPlayers,
          );

        /*
         * Load up to three seasons of
         * historical data.
         */

        const history =
          await getHistoricalUnderstatData(
            player,
            {
              seasonsBack: 3,

              currentSeason:
                UNDERSTAT_CURRENT_SEASON,
            },
          );

        const historical =
          calculateHistoricalSummary(
            history,
          );

        const fixture =
          findPlayerFixture(
            player,
            fixtures,
            nextGameweek.id,
          );

        const prediction =
          createPlayerPrediction({
            player,

            historical,

            fixture,
          });

        predictions.push({
          ...player,

          understatMatched:
            Boolean(
              currentUnderstat,
            ),

          understat:
            currentUnderstat
              ? {
                  id:
                    currentUnderstat.understatId,

                  xg:
                    Number(
                      currentUnderstat.xg ||
                        0,
                    ),

                  xa:
                    Number(
                      currentUnderstat.xa ||
                        0,
                    ),

                  shots:
                    Number(
                      currentUnderstat.shots ||
                        0,
                    ),

                  keyPasses:
                    Number(
                      currentUnderstat.keyPasses ||
                        0,
                    ),
                }
              : null,

          historical,

          fixture,

          prediction,
        });
      }

      predictions.sort(
        (a, b) =>
          b.prediction
            .predictedPoints -
          a.prediction
            .predictedPoints,
      );

      return res.json({
        gameweek:
          nextGameweek.id,

        count:
          predictions.length,

        matchedPlayers:
          predictions.filter(
            (player) =>
              player.understatMatched,
          ).length,

        model:
          "PLStats V1",

        predictions:
          predictions.slice(
            0,
            limit,
          ),
      });
    } catch (error) {
      console.error(
        "GET /api/fantasy/predictions failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to generate Fantasy predictions.",

          details:
            process.env
              .NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  },
);

/*
 * -----------------------------------------------------
 * INDIVIDUAL PLAYER
 * -----------------------------------------------------
 */

router.get(
  "/players/:playerId",
  async (req, res) => {
    try {
      const playerId =
        Number(
          req.params.playerId,
        );

      if (
        !Number.isInteger(
          playerId,
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid FPL player ID.",
          });
      }

      const [
        bootstrap,
        summary,
      ] =
        await Promise.all([
          getFplBootstrap(),

          getFplPlayerSummary(
            playerId,
          ),
        ]);

      const teamMap =
        createTeamMap(
          bootstrap.teams,
        );

      const positionMap =
        createPositionMap(
          bootstrap.element_types,
        );

      const rawPlayer =
        bootstrap.elements.find(
          (player) =>
            player.id ===
            playerId,
        );

      if (!rawPlayer) {
        return res
          .status(404)
          .json({
            error:
              "FPL player not found.",
          });
      }

      const player =
        normaliseFplPlayer(
          rawPlayer,
          teamMap,
          positionMap,
        );

      return res.json({
        player,

        history:
          summary.history ||
          [],

        previousSeasons:
          summary.history_past ||
          [],

        fixtures:
          summary.fixtures ||
          [],
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            "Unable to load FPL player.",
        });
    }
  },
);

/*
 * -----------------------------------------------------
 * FIXTURES
 * -----------------------------------------------------
 */

router.get(
  "/fixtures",
  async (req, res) => {
    try {
      const gameweek =
        Number(
          req.query.gameweek,
        );

      const fixtures =
        Number.isInteger(
          gameweek,
        ) &&
        gameweek > 0
          ? await getFplFixturesByGameweek(
              gameweek,
            )
          : await getFplFixtures();

      return res.json({
        count:
          fixtures.length,

        fixtures,
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            "Unable to load FPL fixtures.",
        });
    }
  },
);

router.get(
  "/gameweeks/current",
  async (req, res) => {
    try {
      const bootstrap =
        await getFplBootstrap();

      return res.json({
        current:
          getCurrentGameweek(
            bootstrap.events,
          ),

        next:
          getNextGameweek(
            bootstrap.events,
          ),
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            "Unable to load gameweek.",
        });
    }
  },
);

export default router;