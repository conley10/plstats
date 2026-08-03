import "dotenv/config";
import express from "express";
import cors from "cors";

import homeRouter from "./routes/home.js";
import playersRouter from "./routes/players.js";
import understatRouter from "./routes/understat.js";
import teamsRouter from "./routes/teams.js";
import fixturesRouter from "./routes/fixtures.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://plstats-rlmnj1rck-conley1.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
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