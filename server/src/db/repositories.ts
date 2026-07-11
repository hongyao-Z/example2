import { rankCandidates } from "../services/recommendationService.js";
import {
  type BestResult,
  type ItineraryCandidate,
  type LocationPoint,
  type ManualPrice,
  type SessionResult,
  type Strategy,
} from "../types.js";
import { isPostgresEnabled, query } from "./postgres.js";
import { getDatabase } from "./sqlite.js";

type StoredSessionRow = {
  id: string;
  origin_json?: unknown;
  points_json?: unknown;
  candidates_json?: unknown;
  best_json?: unknown;
  originJson?: unknown;
  pointsJson?: unknown;
  candidatesJson?: unknown;
  bestJson?: unknown;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SaveSessionInput = {
  origin: LocationPoint;
  points: LocationPoint[];
  candidates: ItineraryCandidate[];
  best: BestResult | null;
  strategy: Strategy;
};

export async function saveSession(input: SaveSessionInput): Promise<SessionResult> {
  return isPostgresEnabled() ? savePostgresSession(input) : saveSqliteSession(input);
}

export async function getSession(sessionId: string): Promise<SessionResult | null> {
  return isPostgresEnabled() ? getPostgresSession(sessionId) : getSqliteSession(sessionId);
}

export async function listSessions(limit = 8): Promise<SessionResult[]> {
  return isPostgresEnabled() ? listPostgresSessions(limit) : listSqliteSessions(limit);
}

export async function updateCandidateManualPrice(input: {
  sessionId: string;
  candidateId: string;
  productType: string;
  price: number;
}): Promise<SessionResult | null> {
  return isPostgresEnabled() ? updatePostgresManualPrice(input) : updateSqliteManualPrice(input);
}

async function savePostgresSession(input: SaveSessionInput): Promise<SessionResult> {
  const now = new Date().toISOString();
  const sessionId = createId("session");
  await query(
    `insert into sessions
      (id, origin_json, points_json, candidates_json, best_json, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sessionId,
      JSON.stringify(input.origin),
      JSON.stringify(input.points),
      JSON.stringify(stripRuntimeFields(input.candidates)),
      JSON.stringify(input.best),
      now,
      now,
    ],
  );

  const saved = await getPostgresSession(sessionId);
  if (!saved) throw new Error("failed to save session");
  return saved;
}

async function getPostgresSession(sessionId: string): Promise<SessionResult | null> {
  const result = await query<StoredSessionRow>(
    `select id, origin_json, points_json, candidates_json, best_json, created_at, updated_at
     from sessions where id = $1`,
    [sessionId],
  );
  const row = result.rows[0];
  return row ? rowToSession(row) : null;
}

async function listPostgresSessions(limit = 8): Promise<SessionResult[]> {
  const result = await query<{ id: string }>(
    "select id from sessions order by updated_at desc limit $1",
    [limit],
  );
  const sessions = await Promise.all(result.rows.map((row) => getPostgresSession(row.id)));
  return sessions.filter((session): session is SessionResult => Boolean(session));
}

async function updatePostgresManualPrice(input: {
  sessionId: string;
  candidateId: string;
  productType: string;
  price: number;
}) {
  const session = await getPostgresSession(input.sessionId);
  if (!session) return null;
  const ranked = rankCandidates(applyManualPrice(session.candidates, input), "price_first");
  const now = new Date().toISOString();
  await query(
    `update sessions
     set candidates_json = $1, best_json = $2, updated_at = $3
     where id = $4`,
    [JSON.stringify(ranked.candidates), JSON.stringify(ranked.best), now, input.sessionId],
  );
  return getPostgresSession(input.sessionId);
}

async function saveSqliteSession(input: SaveSessionInput): Promise<SessionResult> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sessionId = createId("session");

  db.prepare(
    `insert into sessions
      (id, origin_json, points_json, candidates_json, best_json, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    JSON.stringify(input.origin),
    JSON.stringify(input.points),
    JSON.stringify(stripRuntimeFields(input.candidates)),
    JSON.stringify(input.best),
    now,
    now,
  );

  const saved = await getSqliteSession(sessionId);
  if (!saved) throw new Error("failed to save session");
  return saved;
}

async function getSqliteSession(sessionId: string): Promise<SessionResult | null> {
  const row = getDatabase()
    .prepare(
      `select id, origin_json as originJson, points_json as pointsJson,
        candidates_json as candidatesJson, best_json as bestJson,
        created_at as createdAt, updated_at as updatedAt
       from sessions where id = ?`,
    )
    .get(sessionId) as StoredSessionRow | undefined;
  return row ? rowToSession(row) : null;
}

async function listSqliteSessions(limit = 8): Promise<SessionResult[]> {
  const rows = getDatabase()
    .prepare("select id from sessions order by updated_at desc limit ?")
    .all(limit) as Array<{ id: string }>;
  const sessions = await Promise.all(rows.map((row) => getSqliteSession(row.id)));
  return sessions.filter((session): session is SessionResult => Boolean(session));
}

async function updateSqliteManualPrice(input: {
  sessionId: string;
  candidateId: string;
  productType: string;
  price: number;
}) {
  const session = await getSqliteSession(input.sessionId);
  if (!session) return null;
  const ranked = rankCandidates(applyManualPrice(session.candidates, input), "price_first");
  const now = new Date().toISOString();
  getDatabase()
    .prepare(
      `update sessions
       set candidates_json = ?, best_json = ?, updated_at = ?
       where id = ?`,
    )
    .run(JSON.stringify(ranked.candidates), JSON.stringify(ranked.best), now, input.sessionId);
  return getSqliteSession(input.sessionId);
}

function rowToSession(row: StoredSessionRow): SessionResult {
  const originValue = row.origin_json ?? row.originJson;
  const pointsValue = row.points_json ?? row.pointsJson;
  const candidatesValue = row.candidates_json ?? row.candidatesJson;
  const bestValue = row.best_json ?? row.bestJson;
  const origin = safeJson<LocationPoint>(originValue, emptyPoint("A"));
  const points = safeJson<LocationPoint[]>(pointsValue, []);
  const storedCandidates = safeJson<ItineraryCandidate[]>(candidatesValue, []);
  const storedBest = safeJson<BestResult | null>(bestValue, null);
  const hasManualPrice = storedCandidates.some((candidate) => Boolean(candidate.manualPrice));
  const strategy: Strategy =
    hasManualPrice || storedBest?.reason === "price_first" ? "price_first" : "time_first";
  const ranked = rankCandidates(storedCandidates.map(stripCandidateRuntimeFields), strategy);
  const createdAt = String(row.created_at ?? row.createdAt ?? new Date().toISOString());
  const updatedAt = String(row.updated_at ?? row.updatedAt ?? createdAt);

  return {
    sessionId: row.id,
    generatedAt: createdAt,
    updatedAt,
    strategy,
    origin,
    points,
    candidates: ranked.candidates,
    best: ranked.best,
    shareUrl: `/share/${row.id}`,
  };
}

function stripRuntimeFields(candidates: ItineraryCandidate[]) {
  return candidates.map(stripCandidateRuntimeFields);
}

function stripCandidateRuntimeFields(candidate: ItineraryCandidate) {
  return {
    ...candidate,
    source: { route: "amap" as const },
  };
}

function applyManualPrice(
  candidates: ItineraryCandidate[],
  input: { candidateId: string; productType: string; price: number },
) {
  const manualPrice: ManualPrice = {
    productType: input.productType,
    price: input.price,
    updatedAt: new Date().toISOString(),
  };
  return candidates.map((candidate) =>
    candidate.id === input.candidateId
      ? {
          ...candidate,
          manualPrice,
        }
      : candidate,
  );
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function safeJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emptyPoint(id: string): LocationPoint {
  return { id, name: "", lng: 0, lat: 0 };
}
