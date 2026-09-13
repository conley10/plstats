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
  optimiseTwoTransfers,
} from "../services/multiTransferService.js";

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
    .slice(
      0,
      count,
    );
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

  function totalFor(
    count,
  ) {
    return Number(
      gameweekProjections
        .slice(
          0,
          count,
        )
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
    createPlayerPrediction({
      player,

      historical,

      fixture:
        firstFixture,
    });

  return {
    ...player,

    historical,

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

router.post(
  "/optimise",
  async (req, res) => {
    try {
      const playerIds =
        Array.isArray(
          req.body.playerIds,
        )
          ? req.body.playerIds.map(
              Number,
            )
          : [];

      if (
        playerIds.length !==
        15
      ) {
        return res
          .status(400)
          .json({
            error:
              "A complete 15-player squad is required.",
          });
      }

      const horizon =
        [1, 3, 5].includes(
          Number(
            req.body.horizon,
          ),
        )
          ? Number(
              req.body.horizon,
            )
          : 3;

      const limit =
        Math.min(
          Math.max(
            Number(
              req.body.limit,
            ) || 10,
            1,
          ),
          10,
        );

      const [
        bootstrap,
        fixtures,
      ] =
        await Promise.all([
          getFplBootstrap(),

          getFplFixtures(),
        ]);

      const teamMap =
        createTeamMap(
          bootstrap.teams,
        );

      const positionMap =
        createPositionMap(
          bootstrap.element_types,
        );

      const rawSquad =
        bootstrap.elements.filter(
          (player) =>
            playerIds.includes(
              player.id,
            ),
        );

      if (
        rawSquad.length !==
        15
      ) {
        return res
          .status(400)
          .json({
            error:
              "One or more squad players could not be found.",
          });
      }

      const validation =
        validateSquad({
          selectedPlayers:
            rawSquad,

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

      const gameweeks =
        getUpcomingGameweeks(
          bootstrap.events,
          5,
        );

      if (
        gameweeks.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "No upcoming gameweeks could be found.",
          });
      }

      const normalisedSquad =
        rawSquad.map(
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

      /*
       * Calculate remaining bank using the
       * current MVP £100m squad assumption.
       */
      const totalSquadCost =
        rawSquad.reduce(
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
          100 -
            totalSquadCost,
          0,
        );

      const squadIds =
        new Set(
          playerIds,
        );

      /*
       * Shortlist candidates before doing
       * the heavier historical enrichment.
       *
       * We keep the stronger players based
       * on current FPL signals.
       */
      const rawCandidates =
        bootstrap.elements
          .filter(
            (player) =>
              !squadIds.has(
                player.id,
              ) &&
              (
                !player.status ||
                ["a", "d"].includes(
                  player.status,
                )
              ),
          )
          .sort(
            (a, b) => {
              const scoreA =
                numberOrZero(
                  a.ep_next,
                ) *
                  0.6 +
                numberOrZero(
                  a.form,
                ) *
                  0.4;

              const scoreB =
                numberOrZero(
                  b.ep_next,
                ) *
                  0.6 +
                numberOrZero(
                  b.form,
                ) *
                  0.4;

              return (
                scoreB -
                scoreA
              );
            },
          );

      /*
       * Keep up to 35 candidates for each
       * position before enrichment.
       */
      const candidateGroups =
        new Map();

      for (const player of rawCandidates) {
        const position =
          player.element_type;

        if (
          !candidateGroups.has(
            position,
          )
        ) {
          candidateGroups.set(
            position,
            [],
          );
        }

        const group =
          candidateGroups.get(
            position,
          );

        if (
          group.length <
          35
        ) {
          group.push(
            player,
          );
        }
      }

      const shortlistedRaw =
        [
          ...candidateGroups.values(),
        ].flat();

      const normalisedCandidates =
        shortlistedRaw.map(
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

      const optimisation =
        optimiseTwoTransfers({
          squadPlayers,

          candidatePlayers,

          remainingBudget,

          horizon,

          limit,
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

        transferCount:
          2,

        model:
          "PLStats Multi-Transfer V1",

        remainingBudget:
          Number(
            remainingBudget.toFixed(
              1,
            ),
          ),

        ...optimisation,
      });
    } catch (error) {
      console.error(
        "POST /api/fantasy/multi-transfers/optimise failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Unable to optimise multiple transfers.",

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