import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function isPostgresEnabled() {
  return Boolean(config.databaseUrl);
}

export function getPool() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl:
        config.nodeEnv === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}
