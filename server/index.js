import "dotenv/config";
import express from "express";
import cors from "cors";
import { testDatabaseConnection } from "./lib/db.js";

import homeRouter from "./routes/home.js";
import playersRouter from "./routes/players.js";
import understatRouter from "./routes/understat.js";
import teamsRouter from "./routes/teams.js";
import fixturesRouter from "./routes/fixtures.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/api/health/database", async (req, res) => {
  try {
    const database = await testDatabaseConnection();

    res.json({
      status: "ok",
      database: "connected",
      time: database.current_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/api/understat", understatRouter);
app.use("/api/home", homeRouter);
app.use("/api/players", playersRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/fixtures", fixturesRouter);

const port = process.env.PORT || 3001;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});