import express from "express";

import {
  getFplBootstrap,
  getFplFixtures,
} from "../lib/fplData.js";

import {
  getHistoricalUnderstatData,
  calculateHistoricalSummary,
} from "../lib/understatData.js";

import {
  createPlayerPrediction,
} from "../services/predictionService.js";

import {
  analyseSquad,
  squadRules,
  validateSquad,
} from "../services/squadService.js";

const router =
  express.Router();

const CURRENT_SEASON =
  Number(
    process.env.FOOTBALL_DATA_SEASON ||
      2026,
  );

function numberOrZero(
  value,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
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
      (event) =>
        event.is_next,
    ) || null
  );
}

function createTeamMap(
  teams = [],
) {
  return new Map(
    teams.map(
      (team) => [
        team.id,
        {
          id:
            team.id,

          name:
            team.name,

          shortName:
            team.short_name,

          code:
            team.code,

          strength:
            team.strength,
        },
      ],
    ),
  );
}

function createPositionMap(
  positions = [],
) {
  return new Map(
    positions.map(
      (position) => [
        position.id,
        {
          id:
            position.id,

          name:
            position.singular_name,

          shortName:
            position.singular_name_short,
        },
      ],
    ),
  );
}

function normaliseSelectedPlayer(
  player,
  teamMap,
  positionMap,
) {
  return {
    id:
      player.id,

    code:
      player.code,

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

    expectedGoals:
      numberOrZero(
        player.expected_goals,
      ),

    expectedAssists:
      numberOrZero(
        player.expected_assists,
      ),

    expectedPoints:
      numberOrZero(
        player.ep_next,
      ),

    chanceOfPlayingNextRound:
      player.chance_of_playing_next_round,

    chanceOfPlayingThisRound:
      player.chance_of_playing_this_round,

    status:
      player.status,

    news:
      player.news || "",
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
          item.team_h ===
            teamId ||
          item.team_a ===
            teamId
        ),
    );

  if (!fixture) {
    return null;
  }

  const home =
    fixture.team_h ===
    teamId;

  return {
    id:
      fixture.id,

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

function getRequestedPlayers(
  playerIds,
  bootstrap,
) {
  if (
    !Array.isArray(
      playerIds,
    )
  ) {
    return {
      error:
        "playerIds must be an array.",
    };
  }

  const ids =
    playerIds.map(
      Number,
    );

  if (
    ids.some(
      (id) =>
        !Number.isInteger(
          id,
        ),
    )
  ) {
    return {
      error:
        "Every player ID must be a valid integer.",
    };
  }

  const uniqueIds = [
    ...new Set(ids),
  ];

  if (
    uniqueIds.length !==
    ids.length
  ) {
    return {
      error:
        "The squad contains duplicate players.",
    };
  }

  const players =
    bootstrap.elements.filter(
      (player) =>
        uniqueIds.includes(
          player.id,
        ),
    );

  if (
    players.length !==
    uniqueIds.length
  ) {
    return {
      error:
        "One or more selected players could not be found.",
    };
  }

  return {
    players,
  };
}

/*
 * GET /api/fantasy/squad/rules
 */
router.get(
  "/rules",
  (req, res) => {
    return res.json(
      squadRules,
    );
  },
);

/*
 * POST /api/fantasy/squad/validate
 */
router.post(
  "/validate",
  async (req, res) => {
    try {
      const bootstrap =
        await getFplBootstrap();

      const result =
        getRequestedPlayers(
          req.body.playerIds,
          bootstrap,
        );

      if (
        result.error
      ) {
        return res
          .status(400)
          .json({
            error:
              result.error,
          });
      }

      const teamMap =
        createTeamMap(
          bootstrap.teams,
        );

      const positionMap =
        createPositionMap(
          bootstrap.element_types,
        );

      const validation =
        validateSquad({
          selectedPlayers:
            result.players,

          teamMap,

          positionMap,
        });

      const players =
        result.players.map(
          (player) =>
            normaliseSelectedPlayer(
              player,
              teamMap,
              positionMap,
            ),
        );

      return res.json({
        ...validation,

        players,
      });
    } catch (error) {
      console.error(
        "POST /api/fantasy/squad/validate failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to validate Fantasy squad.",

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
 * POST /api/fantasy/squad/analyse
 *
 * {
 *   "playerIds": [...]
 * }
 */
router.post(
  "/analyse",
  async (req, res) => {
    try {
      const [
        bootstrap,
        fixtures,
      ] =
        await Promise.all([
          getFplBootstrap(),

          getFplFixtures(),
        ]);

      const result =
        getRequestedPlayers(
          req.body.playerIds,
          bootstrap,
        );

      if (
        result.error
      ) {
        return res
          .status(400)
          .json({
            error:
              result.error,
          });
      }

      const teamMap =
        createTeamMap(
          bootstrap.teams,
        );

      const positionMap =
        createPositionMap(
          bootstrap.element_types,
        );

      const validation =
        validateSquad({
          selectedPlayers:
            result.players,

          teamMap,

          positionMap,
        });

      if (
        !validation.valid
      ) {
        return res
          .status(400)
          .json({
            valid:
              false,

            errors:
              validation.errors,

            summary:
              validation.summary,

            error:
              "Squad does not meet FPL rules.",
          });
      }

      const predictionGameweek =
        getNextGameweek(
          bootstrap.events,
        ) ||
        getCurrentGameweek(
          bootstrap.events,
        );

      if (
        !predictionGameweek
      ) {
        return res
          .status(404)
          .json({
            error:
              "No active gameweek could be found.",
          });
      }

      const normalisedPlayers =
        result.players.map(
          (player) =>
            normaliseSelectedPlayer(
              player,
              teamMap,
              positionMap,
            ),
        );

      const analysedPlayers =
        await Promise.all(
          normalisedPlayers.map(
            async (player) => {
              const history =
                await getHistoricalUnderstatData(
                  player,
                  {
                    seasonsBack: 3,

                    currentSeason:
                      CURRENT_SEASON,
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
                  predictionGameweek.id,
                );

              const prediction =
                createPlayerPrediction({
                  player,

                  historical,

                  fixture,
                });

              return {
                ...player,

                historical,

                fixture,

                prediction,
              };
            },
          ),
        );

      const analysis =
        analyseSquad(
          analysedPlayers,
        );

      return res.json({
        valid:
          true,

        gameweek:
          predictionGameweek.id,

        model:
          "PLStats V1",

        validation:
          validation.summary,

        analysis,
      });
    } catch (error) {
      console.error(
        "POST /api/fantasy/squad/analyse failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to analyse Fantasy squad.",

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

export default router;