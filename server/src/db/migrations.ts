import { getDatabase } from "./sqlite.js";
import { isPostgresEnabled, query } from "./postgres.js";

export async function ensureDatabase() {
  if (isPostgresEnabled()) {
    await migratePostgres();
    return;
  }
  getDatabase();
}

async function migratePostgres() {
  await query(`
    create table if not exists sessions (
      id text primary key,
      origin_json jsonb not null,
      points_json jsonb not null,
      candidates_json jsonb not null,
      best_json jsonb,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create index if not exists idx_sessions_updated_at
      on sessions(updated_at desc);
  `);
}
