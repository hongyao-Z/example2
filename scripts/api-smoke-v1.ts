import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

const port = 8795;
const child = spawn("cmd.exe", ["/d", "/s", "/c", "npx.cmd tsx server/src/index.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), CORS_ORIGIN: "*" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

let stdout = "";
let stderr = "";
child.stdout?.on("data", (chunk: Buffer) => {
  stdout += chunk.toString("utf8");
});
child.stderr?.on("data", (chunk: Buffer) => {
  stderr += chunk.toString("utf8");
});

type HealthPayload = {
  ok: boolean;
  service: string;
};

type PlacesPayload = {
  items: unknown[];
};

type ComparePayload = {
  sessionId: string;
  best: { id: string; reason: string; message: string } | null;
  candidates: Array<{ polyline: unknown[]; steps: unknown[]; recommendReason: string }>;
};

try {
  const health = await waitForJson<HealthPayload>(`http://127.0.0.1:${port}/api/health`, 12000);
  assert.equal(health.ok, true);
  assert.equal(health.service, "multi-stop-route-decision-api");

  const places = await getJson<PlacesPayload>(
    `http://127.0.0.1:${port}/api/places/search?q=${encodeURIComponent(
      "中国传媒大学",
    )}&city=${encodeURIComponent("北京市")}`,
  );
  assert.ok(Array.isArray(places.items));

  const compare = await postJson<ComparePayload>(`http://127.0.0.1:${port}/api/itineraries/compare`, {
    origin: { id: "A", name: "中国传媒大学", lng: 116.557391, lat: 39.912312 },
    points: [
      { id: "B", name: "双惠苑肆号院", lng: 116.57356, lat: 39.906005 },
      { id: "C", name: "乐乎公寓", lng: 116.56714, lat: 39.910423 },
    ],
    strategy: "time_first",
  });
  assert.ok(compare.sessionId);
  assert.equal(compare.candidates.length, 2);
  assert.ok(compare.candidates.every((candidate) => Array.isArray(candidate.polyline)));
  assert.ok(compare.candidates.every((candidate) => Array.isArray(candidate.steps)));
  assert.ok(compare.candidates.every((candidate) => candidate.recommendReason));
  assert.ok(compare.best?.message);
  assert.ok(
    ["time_first", "distance_tiebreaker"].includes(compare.best.reason),
    `unexpected best.reason: ${compare.best.reason}`,
  );

  console.log("api smoke tests passed");
} catch (error) {
  console.error(stdout.trim());
  console.error(stderr.trim());
  throw error;
} finally {
  stopProcessTree(child.pid);
}

async function waitForJson<T>(url: string, timeoutMs: number): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      return await getJson<T>(url);
    } catch (error) {
      lastError = error;
      await wait(300);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("server did not become ready");
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload));
  return payload as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload));
  return payload as T;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopProcessTree(pid?: number) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill();
}
