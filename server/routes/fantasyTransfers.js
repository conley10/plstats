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
  validateSquad,
} from "../services/squadService.js";

import {
  findWeakestTransferCandidate,
  recommendTransfers,
} from "../services/transferService.js";

const router =
  express.Router();

const CURRENT_SEASON =
  Number(
    process.env.FOOTBALL_DATA_SEASON ||
      2026,
  );

function numberOrZero(value) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
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

function normalisePlayer(
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

function getUpcomingGameweeks(
  events = [],
  count = 5,
) {
  const next =
    events.find(
      (event) =>
        event.is_next,
    );

  const current =
    events.find(
      (event) =>
        event.is_current,
    );

  const start =
    next || current;

  if (!start) {
    return [];
  }

  return events
    .filter(
      (event) =>
        event.id >=
          start.id &&
        !event.finished,
    )
    .sort(
      (a, b) =>
        a.id - b.id,
    )
    .slice(0, count);
}

function findPlayerFixtures(
  player,
  fixtures,
  gameweek,
) {
  const teamId =
    player.team?.id;

  if (!teamId) {
    return [];
  }

  return fixtures
    .filter(
      (fixture) =>
        fixture.event ===
          gameweek &&
        (
          fixture.team_h ===
            teamId ||
          fixture.team_a ===
            teamId
        ),
    )
    .map(
      (fixture) => {
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
      },
    );
}

async function enrichPlayer({
  player,
  fixtures,
  gameweeks,
}) {
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

  const gameweekProjections =
    gameweeks.map(
      (gameweek) => {
        const playerFixtures =
          findPlayerFixtures(
            player,
            fixtures,
            gameweek.id,
          );

        /*
         * Blank gameweek:
         * no fixture = 0 projected
         * points for that GW.
         */
        if (
          playerFixtures.length ===
          0
        ) {
          return {
            gameweek:
              gameweek.id,

            fixtures: [],

            projectedPoints:
              0,
          };
        }

        /*
         * Handles both normal and
         * double gameweeks by summing
         * each fixture's projection.
         */
        const fixturePredictions =
          playerFixtures.map(
            (fixture) => {
              const prediction =
                createPlayerPrediction({
                  player,

                  historical,

                  fixture,
                });

              return {
                fixture,

                prediction,
              };
            },
          );

        const projectedPoints =
          fixturePredictions.reduce(
            (total, item) =>
              total +
              numberOrZero(
                item.prediction
                  ?.predictedPoints,
              ),
            0,
          );

        return {
          gameweek:
            gameweek.id,

          fixtures:
            fixturePredictions.map(
              (item) => ({
                ...item.fixture,

                predictedPoints:
                  numberOrZero(
                    item.prediction
                      ?.predictedPoints,
                  ),
              }),
            ),

          projectedPoints:
            Number(
              projectedPoints.toFixed(
                1,
              ),
            ),
        };
      },
    );

  function totalFor(count) {
    return Number(
      gameweekProjections
        .slice(0, count)
        .reduce(
          (total, gw) =>
            total +
            numberOrZero(
              gw.projectedPoints,
            ),
          0,
        )
        .toFixed(1),
    );
  }

  const firstFixture =
    gameweekProjections
      .flatMap(
        (gw) =>
          gw.fixtures,
      )[0] || null;

  const firstPrediction =
    firstFixture
      ? createPlayerPrediction({
          player,

          historical,

          fixture:
            firstFixture,
        })
      : createPlayerPrediction({
          player,

          historical,

          fixture: null,
        });

  return {
    ...player,

    historical,

    fixture:
      firstFixture,

    prediction:
      firstPrediction,

    multiGameweek: {
      gameweeks:
        gameweekProjections,

      totals: {
        1:
          totalFor(1),

        3:
          totalFor(3),

        5:
          totalFor(5),
      },
    },
  };
}

function getRequestedSquad(
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
    playerIds.map(Number);

  if (
    ids.length !== 15
  ) {
    return {
      error:
        "A transfer plan requires a complete 15-player squad.",
    };
  }

  if (
    ids.some(
      (id) =>
        !Number.isInteger(id),
    )
  ) {
    return {
      error:
        "Every player ID must be valid.",
    };
  }

  const uniqueIds = [
    ...new Set(ids),
  ];

  if (
    uniqueIds.length !== 15
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
    players.length !== 15
  ) {
    return {
      error:
        "One or more squad players could not be found.",
    };
  }

  return {
    players,
  };
}

/*
 * POST /api/fantasy/transfers/recommend
 *
 * {
 *   playerIds: [...],
 *   outgoingPlayerId: optional,
 *   horizon: 1 | 3 | 5,
 *   limit: 10
 * }
 */
router.post(
  "/recommend",
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

      const horizon =
        [1, 3, 5].includes(
          Number(
            req.body.horizon,
          ),
        )
          ? Number(
              req.body.horizon,
            )
          : 1;

      const gameweeks =
        getUpcomingGameweeks(
          bootstrap.events,
          5,
        );

      if (
        gameweeks.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "No upcoming gameweeks could be found.",
          });
      }

      const requestedSquad =
        getRequestedSquad(
          req.body.playerIds,
          bootstrap,
        );

      if (
        requestedSquad.error
      ) {
        return res
          .status(400)
          .json({
            error:
              requestedSquad.error,
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
            requestedSquad.players,

          teamMap,

          positionMap,
        });

      if (
        !validation.valid
      ) {
        return res
          .status(400)
          .json({
            error:
              "Current squad is invalid.",

            errors:
              validation.errors,
          });
      }

      const normalisedSquad =
        requestedSquad.players.map(
          (player) =>
            normalisePlayer(
              player,
              teamMap,
              positionMap,
            ),
        );

      const squadPlayers =
        await Promise.all(
          normalisedSquad.map(
            (player) =>
              enrichPlayer({
                player,

                fixtures,

                gameweeks,
              }),
          ),
        );

      let outgoingPlayerId =
        Number(
          req.body.outgoingPlayerId,
        );

      const manualOutgoing =
        Number.isInteger(
          outgoingPlayerId,
        );

      if (!manualOutgoing) {
        const weakest =
          findWeakestTransferCandidate(
            squadPlayers,
            horizon,
          );

        outgoingPlayerId =
          weakest?.id;
      }

      const outgoingPlayer =
        squadPlayers.find(
          (player) =>
            player.id ===
            outgoingPlayerId,
        );

      if (
        !outgoingPlayer
      ) {
        return res
          .status(400)
          .json({
            error:
              "Selected outgoing player is not in the current squad.",
          });
      }

      const rawOutgoing =
        requestedSquad.players.find(
          (player) =>
            player.id ===
            outgoingPlayerId,
        );

      const outgoingPositionId =
        rawOutgoing.element_type;

      const totalCost =
        requestedSquad.players.reduce(
          (total, player) =>
            total +
            numberOrZero(
              player.now_cost,
            ) /
              10,
          0,
        );

      const remainingBudget =
        Math.max(
          100 - totalCost,
          0,
        );

      const maxCandidatePrice =
        outgoingPlayer.price +
        remainingBudget;

      const squadIdSet =
        new Set(
          req.body.playerIds.map(
            Number,
          ),
        );

      const rawCandidates =
        bootstrap.elements.filter(
          (candidate) =>
            candidate.element_type ===
              outgoingPositionId &&
            !squadIdSet.has(
              candidate.id,
            ) &&
            numberOrZero(
              candidate.now_cost,
            ) /
              10 <=
              maxCandidatePrice,
        );

      const normalisedCandidates =
        rawCandidates.map(
          (player) =>
            normalisePlayer(
              player,
              teamMap,
              positionMap,
            ),
        );

      const candidatePlayers =
        await Promise.all(
          normalisedCandidates.map(
            (player) =>
              enrichPlayer({
                player,

                fixtures,

                gameweeks,
              }),
          ),
        );

      const result =
        recommendTransfers({
          squadPlayers,

          candidatePlayers,

          outgoingPlayerId,

          remainingBudget,

          horizon,

          limit:
            Math.min(
              Math.max(
                Number(
                  req.body.limit,
                ) || 10,
                1,
              ),
              20,
            ),
        });

      return res.json({
        gameweek:
          gameweeks[0].id,

        gameweeks:
          gameweeks.map(
            (gameweek) =>
              gameweek.id,
          ),

        horizon,

        model:
          "PLStats V1",

        transferModel:
          "PLStats Transfer V2",

        remainingBudget:
          Number(
            remainingBudget.toFixed(
              1,
            ),
          ),

        autoSelected:
          !manualOutgoing,

        ...result,
      });
    } catch (error) {
      console.error(
        "POST /api/fantasy/transfers/recommend failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to generate transfer recommendations.",

          details:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  },
);

export default router;