import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | null = null;

export function getDatabase() {
  if (database) return database;
  const dataDir = path.resolve(process.cwd(), "server", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  database = new DatabaseSync(path.join(dataDir, "app.db"));
  initializeDatabase(database);
  return database;
}

function initializeDatabase(db: DatabaseSync) {
  db.exec(`
    create table if not exists sessions (
      id text primary key,
      origin_json text not null,
      points_json text not null,
      candidates_json text not null,
      best_json text,
      created_at text not null,
      updated_at text not null
    );

  `);
}
