import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const dataDirectory = path.resolve(
  currentDirectory,
  "../data",
);

router.get("/players", async (req, res) => {
  try {
    const season =
      req.query.season ||
      process.env.FOOTBALL_DATA_SEASON ||
      "2026";

    const filePath = path.join(
      dataDirectory,
      `understat-players-${season}.json`,
    );

    const fileContents = await fs.readFile(
      filePath,
      "utf8",
    );

    const data = JSON.parse(fileContents);

    return res.json(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        error: "Understat data has not been imported.",
        details:
          "Run the Python Understat import script for this season.",
      });
    }

    console.error(
      "GET /api/understat/players failed:",
      error,
    );

    return res.status(500).json({
      error: "Unable to read Understat player data.",
    });
  }
});

export default router;