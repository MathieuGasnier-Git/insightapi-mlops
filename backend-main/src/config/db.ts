import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pool = new Pool({ connectionString });

// No migration framework in this project yet - this idempotent DDL is the
// whole "schema management" story. Called once at server boot (see index.ts),
// never from createApp(), so unit tests that mock this module never hit it.
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      user_sub TEXT NOT NULL,
      user_email TEXT,
      input_text TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL,
      model_version TEXT,
      model_stage TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_predictions_user_sub_created_at
      ON predictions (user_sub, created_at DESC);
  `);
}
