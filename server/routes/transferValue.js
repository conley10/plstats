import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  findSimilarPlayers,
} from "../lib/playerSimilarity.js";

const router = express.Router();

const __filename = fileURLToPath(
  import.meta.url,
);

const __dirname = path.dirname(
  __filename,
);

const predictionsFile = path.join(
  __dirname,
  "..",
  "data",
  "transfer-value-predictions.json",
);

function loadPredictions() {
  const raw = fs.readFileSync(
    predictionsFile,
    "utf8",
  );

  return JSON.parse(raw);
}

function numberOrNull(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function buildOpportunity(player) {
  const marketValue =
    numberOrNull(
      player.previousMarketValueEur,
    );

  const predictedValue =
    numberOrNull(
      player.predictedMarketValueEur,
    );

  if (
    marketValue === null ||
    predictedValue === null ||
    marketValue <= 0
  ) {
    return null;
  }

  const valueGap =
    predictedValue -
    marketValue;

  const valueGapPercent =
    (valueGap / marketValue) *
    100;

  return {
    ...player,

    modelValueGapEur:
      Math.round(valueGap),

    modelValueGapPercent:
      Number(
        valueGapPercent.toFixed(
          2,
        ),
      ),
  };
}


// --------------------------------------------------
// GET /api/transfer-values
// Returns all predictions
// --------------------------------------------------

router.get("/", (req, res) => {
  try {
    const data =
      loadPredictions();

    res.json(data);
  } catch (error) {
    console.error(
      "Failed to load transfer-value predictions:",
      error,
    );

    res.status(500).json({
      error:
        "Failed to load transfer-value predictions.",
    });
  }
});


// --------------------------------------------------
// GET /api/transfer-values/top
// Returns highest predicted values
// --------------------------------------------------

router.get("/top", (req, res) => {
  try {
    const data =
      loadPredictions();

    const requestedLimit =
      Number(
        req.query.limit ?? 10,
      );

    const limit = Math.min(
      Math.max(
        requestedLimit,
        1,
      ),
      100,
    );

    const players = [
      ...data.players,
    ]
      .sort(
        (a, b) =>
          b.predictedMarketValueEur -
          a.predictedMarketValueEur,
      )
      .slice(
        0,
        limit,
      );

    res.json({
      model: data.model,
      season: data.season,
      count: players.length,
      players,
    });
  } catch (error) {
    console.error(
      "Failed to load top transfer values:",
      error,
    );

    res.status(500).json({
      error:
        "Failed to load top transfer values.",
    });
  }
});


// --------------------------------------------------
// GET /api/transfer-values/search?q=haaland
// --------------------------------------------------

router.get(
  "/search",
  (req, res) => {
    try {
      const data =
        loadPredictions();

      const query = String(
        req.query.q ?? "",
      )
        .trim()
        .toLowerCase();

      if (!query) {
        return res.json({
          count: 0,
          players: [],
        });
      }

      const players =
        data.players
          .filter(
            (player) => {
              const name =
                String(
                  player.player ??
                    "",
                ).toLowerCase();

              const team =
                String(
                  player.team ??
                    "",
                ).toLowerCase();

              return (
                name.includes(
                  query,
                ) ||
                team.includes(
                  query,
                )
              );
            },
          )
          .slice(
            0,
            50,
          );

      return res.json({
        count:
          players.length,
        players,
      });
    } catch (error) {
      console.error(
        "Transfer-value search failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Transfer-value search failed.",
        });
    }
  },
);


// --------------------------------------------------
// GET /api/transfer-values/opportunities
//
// Finds players whose PLStats predicted value is
// above their previous recorded market value.
//
// Optional query parameters:
//
// limit=20
// position=Midfield
// team=Arsenal
// maxAge=24
// maxValue=30000000
// minMinutes=1500
// minGap=5000000
// minGapPercent=20
// --------------------------------------------------

router.get(
  "/opportunities",
  (req, res) => {
    try {
      const data =
        loadPredictions();

      const requestedLimit =
        Number(
          req.query.limit ??
            25,
        );

      const limit = Math.min(
        Math.max(
          requestedLimit,
          1,
        ),
        100,
      );

      const position =
        String(
          req.query.position ??
            "",
        )
          .trim()
          .toLowerCase();

      const team =
        String(
          req.query.team ??
            "",
        )
          .trim()
          .toLowerCase();

      const maxAge =
        numberOrNull(
          req.query.maxAge,
        );

      const maxValue =
        numberOrNull(
          req.query.maxValue,
        );

      const minMinutes =
        numberOrNull(
          req.query.minMinutes,
        );

      const minGap =
        numberOrNull(
          req.query.minGap,
        );

      const minGapPercent =
        numberOrNull(
          req.query.minGapPercent,
        );

      let players =
        data.players
          .map(
            buildOpportunity,
          )
          .filter(Boolean);

      // Only positive model-value
      // opportunities.
      players =
        players.filter(
          (player) =>
            player.modelValueGapEur >
            0,
        );

      if (position) {
        players =
          players.filter(
            (player) => {
              const playerPosition =
                String(
                  player.transfermarktPosition ??
                    player.position ??
                    "",
                ).toLowerCase();

              return playerPosition.includes(
                position,
              );
            },
          );
      }

      if (team) {
        players =
          players.filter(
            (player) =>
              String(
                player.team ??
                  "",
              )
                .toLowerCase()
                .includes(
                  team,
                ),
          );
      }

      if (maxAge !== null) {
        players =
          players.filter(
            (player) =>
              Number(
                player.age,
              ) <=
              maxAge,
          );
      }

      if (
        maxValue !== null
      ) {
        players =
          players.filter(
            (player) =>
              Number(
                player.previousMarketValueEur,
              ) <=
              maxValue,
          );
      }

      if (
        minMinutes !== null
      ) {
        players =
          players.filter(
            (player) =>
              Number(
                player.minutes ??
                  0,
              ) >=
              minMinutes,
          );
      }

      if (minGap !== null) {
        players =
          players.filter(
            (player) =>
              player.modelValueGapEur >=
              minGap,
          );
      }

      if (
        minGapPercent !==
        null
      ) {
        players =
          players.filter(
            (player) =>
              player.modelValueGapPercent >=
              minGapPercent,
          );
      }

      // Largest absolute model-value
      // gap first.
      players.sort(
        (a, b) =>
          b.modelValueGapEur -
          a.modelValueGapEur,
      );

      const totalModelValueGap =
        players.reduce(
          (total, player) =>
            total +
            player.modelValueGapEur,
          0,
        );

      const results =
        players.slice(
          0,
          limit,
        );

      return res.json({
        model: data.model,
        season: data.season,

        methodology: {
          description:
            "Players whose PLStats predicted market value exceeds their previous recorded market value.",

          formula:
            "predictedMarketValueEur - previousMarketValueEur",
        },

        filters: {
          position:
            position || null,
          team:
            team || null,
          maxAge,
          maxValue,
          minMinutes,
          minGap,
          minGapPercent,
        },

        matchingPlayers:
          players.length,

        count:
          results.length,

        totalModelValueGapEur:
          Math.round(
            totalModelValueGap,
          ),

        players: results,
      });
    } catch (error) {
      console.error(
        "Failed to load market opportunities:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to load market opportunities.",
        });
    }
  },
);

// --------------------------------------------------
// GET /api/transfer-values/:understatId/similar
//
// Finds statistically similar players using
// position-specific, per-90 performance profiles.
// --------------------------------------------------

router.get(
  "/:understatId/similar",
  (req, res) => {
    try {
      const data =
        loadPredictions();

      const requestedId =
        String(
          req.params.understatId,
        );

      const targetPlayer =
        data.players.find(
          (player) =>
            String(
              player.understatId,
            ) === requestedId,
        );

      if (!targetPlayer) {
        return res
          .status(404)
          .json({
            error:
              "Player not found.",
          });
      }

      const requestedLimit =
        Number(
          req.query.limit ??
            10,
        );

      const limit =
        Math.min(
          Math.max(
            requestedLimit,
            1,
          ),
          25,
        );

      const requestedMinMinutes =
        Number(
          req.query.minMinutes ??
            900,
        );

      const minMinutes =
        Number.isFinite(
          requestedMinMinutes,
        )
          ? Math.max(
              requestedMinMinutes,
              0,
            )
          : 900;

      /*
       * The transfer-value export already
       * contains the Understat performance
       * fields required by the similarity
       * engine.
       */

      const similarPlayers =
        findSimilarPlayers({
          targetPlayer,
          players:
            data.players,
          limit,
          minMinutes,
        });

      /*
       * Attach valuation information so
       * the frontend can identify cheaper
       * statistical alternatives.
       */

      const results =
        similarPlayers.map(
          (player) => {
            const targetValue =
              Number(
                targetPlayer.previousMarketValueEur ??
                  0,
              );

            const playerValue =
              Number(
                player.previousMarketValueEur ??
                  0,
              );

            const saving =
              targetValue > 0 &&
              playerValue > 0
                ? targetValue -
                  playerValue
                : null;

            return {
              understatId:
                player.understatId,

              player:
                player.player,

              team:
                player.team,

              position:
                player.position,

              transfermarktPosition:
                player.transfermarktPosition,

              age:
                player.age,

              minutes:
                player.minutes,

              similarity:
                player.similarity,

              marketValueEur:
                player.previousMarketValueEur,

              predictedMarketValueEur:
                player.predictedMarketValueEur,

              modelValueGapEur:
                Number(
                  player.predictedMarketValueEur ??
                    0,
                ) -
                Number(
                  player.previousMarketValueEur ??
                    0,
                ),

              savingVsTargetEur:
                saving,

              cheaperThanTarget:
                saving !== null &&
                saving > 0,

              similarityMetrics:
  player.similarityMetrics,

metricMatches:
  player.metricMatches,

explanation:
  player.explanation,

profileDistance:
  player.profileDistance,
            };
          },
        );

      const cheaperAlternatives =
        results
          .filter(
            (player) =>
              player.cheaperThanTarget,
          )
          .sort(
            (a, b) => {
              /*
               * Similarity remains the
               * primary ranking criterion.
               */
              if (
                b.similarity !==
                a.similarity
              ) {
                return (
                  b.similarity -
                  a.similarity
                );
              }

              return (
                Number(
                  b.savingVsTargetEur ??
                    0,
                ) -
                Number(
                  a.savingVsTargetEur ??
                    0,
                )
              );
            },
          );

      return res.json({
        model:
          "PLStats Similar Players V2",

        season:
          data.season,

        methodology: {
          metrics: [
            "shotsPer90",
            "keyPassesPer90",
            "xgPer90",
            "xaPer90",
            "xgChainPer90",
            "xgBuildupPer90",
          ],

          standardisation:
  "Z-score",

similarity:
  "Weighted Euclidean distance",

positionRestricted:
  true,

positionSource:
  "Transfermarkt broad position",

positionWeights:
  true,

          minimumMinutes:
            minMinutes,
        },

        target: {
          understatId:
            targetPlayer.understatId,

          player:
            targetPlayer.player,

          team:
            targetPlayer.team,

          position:
            targetPlayer.position,

          transfermarktPosition:
            targetPlayer.transfermarktPosition,

          age:
            targetPlayer.age,

          minutes:
            targetPlayer.minutes,

          marketValueEur:
            targetPlayer.previousMarketValueEur,

          predictedMarketValueEur:
            targetPlayer.predictedMarketValueEur,
        },

        count:
          results.length,

        similarPlayers:
          results,

        cheaperAlternatives,
      });
    } catch (error) {
      console.error(
        "Similar player analysis failed:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Similar player analysis failed.",
        });
    }
  },
);


// --------------------------------------------------
// GET /api/transfer-values/:understatId
// Returns one player
//
// IMPORTANT:
// Keep this BELOW /opportunities.
// --------------------------------------------------

router.get(
  "/:understatId",
  (req, res) => {
    try {
      const data =
        loadPredictions();

      const requestedId =
        String(
          req.params.understatId,
        );

      const player =
        data.players.find(
          (item) =>
            String(
              item.understatId,
            ) ===
            requestedId,
        );

      if (!player) {
        return res
          .status(404)
          .json({
            error:
              "Player prediction not found.",
          });
      }

      return res.json({
        model: data.model,
        season: data.season,
        validation:
          data.validation,
        player,
      });
    } catch (error) {
      console.error(
        "Failed to load player transfer value:",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to load player transfer value.",
        });
    }
  },
);

export default router;