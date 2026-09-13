import "dotenv/config";

import express from "express";
import cors from "cors";

import {
  testDatabaseConnection,
} from "./lib/db.js";

import homeRouter from "./routes/home.js";
import playersRouter from "./routes/players.js";
import understatRouter from "./routes/understat.js";
import teamsRouter from "./routes/teams.js";
import fixturesRouter from "./routes/fixtures.js";
import fantasyRouter from "./routes/fantasy.js";
import fantasySquadRouter from "./routes/fantasySquad.js";
import fantasyTransfersRouter from "./routes/fantasyTransfers.js";
import fantasyMultiTransfersRouter from "./routes/fantasyMultiTransfers.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",
    });
  },
);

app.get(
  "/api/health/database",
  async (req, res) => {
    try {
      const database =
        await testDatabaseConnection();

      res.json({
        status: "ok",

        database:
          "connected",

        time:
          database.current_time,
      });
    } catch (error) {
      console.error(
        "Database connection failed:",
        error,
      );

      res.status(500).json({
        status: "error",

        database:
          "disconnected",
      });
    }
  },
);

app.use(
  "/api/understat",
  understatRouter,
);

app.use(
  "/api/home",
  homeRouter,
);

app.use(
  "/api/players",
  playersRouter,
);

app.use(
  "/api/teams",
  teamsRouter,
);

app.use(
  "/api/fixtures",
  fixturesRouter,
);

app.use(
  "/api/fantasy/squad",
  fantasySquadRouter,
);

app.use(
  "/api/fantasy/transfers",
  fantasyTransfersRouter,
);

app.use(
  "/api/fantasy/multi-transfers",
  fantasyMultiTransfersRouter,
);

app.use(
  "/api/fantasy",
  fantasyRouter,
);

const port =
  process.env.PORT ||
  3001;

app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `PLStats API running on port ${port}`,
    );

    console.log(
      `Fantasy API: http://localhost:${port}/api/fantasy`,
    );

    console.log(
      `Fantasy Squad API: http://localhost:${port}/api/fantasy/squad`,
    );
  },
);