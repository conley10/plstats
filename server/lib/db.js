import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function testDatabaseConnection() {
  const result = await pool.query("SELECT NOW() AS current_time");
  return result.rows[0];
}

export default pool;

export async function initialiseDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gameweeks (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      gameweek INTEGER NOT NULL,
      snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(season, gameweek)
    );
  `);

  console.log("Database tables initialised");
}