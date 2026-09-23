import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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


// --------------------------------------------------
// GET /api/transfer-values
// Returns all predictions
// --------------------------------------------------

router.get("/", (req, res) => {
  try {
    const data = loadPredictions();

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
    const data = loadPredictions();

    const requestedLimit = Number(
      req.query.limit ?? 10,
    );

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100,
    );

    const players = [...data.players]
      .sort(
        (a, b) =>
          b.predictedMarketValueEur -
          a.predictedMarketValueEur,
      )
      .slice(0, limit);

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

router.get("/search", (req, res) => {
  try {
    const data = loadPredictions();

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

    const players = data.players
      .filter((player) => {
        const name = String(
          player.player ?? "",
        ).toLowerCase();

        const team = String(
          player.team ?? "",
        ).toLowerCase();

        return (
          name.includes(query) ||
          team.includes(query)
        );
      })
      .slice(0, 50);

    return res.json({
      count: players.length,
      players,
    });
  } catch (error) {
    console.error(
      "Transfer-value search failed:",
      error,
    );

    return res.status(500).json({
      error:
        "Transfer-value search failed.",
    });
  }
});


// --------------------------------------------------
// GET /api/transfer-values/:understatId
// Returns one player
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
            ) === requestedId,
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