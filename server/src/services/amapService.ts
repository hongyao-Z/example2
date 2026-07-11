import { config } from "../config.js";
import { parseAmapStepsPolyline } from "../core/polyline.js";
import {
  ApiError,
  type CitySearchItem,
  type LocationPoint,
  type PoiSearchItem,
  type RoutePlan,
  type RouteStep,
} from "../types.js";

export async function searchPlaces(input: {
  q: string;
  city?: string;
}): Promise<PoiSearchItem[]> {
  if (!config.amapServiceKey) throw new ApiError("AMAP_SERVICE_KEY is not configured", 500);
  const keywords = input.q.trim();
  if (keywords.length < 2) throw new ApiError("q must be at least 2 characters", 400);

  const url = new URL("https://restapi.amap.com/v3/place/text");
  url.searchParams.set("key", config.amapServiceKey);
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("offset", "10");
  url.searchParams.set("page", "1");
  url.searchParams.set("extensions", "all");
  if (input.city?.trim()) {
    url.searchParams.set("city", input.city.trim());
    url.searchParams.set("citylimit", "true");
  }

  const payload = await fetchAmap(url);
  const pois = Array.isArray(payload.pois) ? payload.pois : [];
  return pois.map(normalizePoi).filter((item): item is PoiSearchItem => Boolean(item));
}

export async function searchCities(input: { q: string }): Promise<CitySearchItem[]> {
  if (!config.amapServiceKey) throw new ApiError("AMAP_SERVICE_KEY is not configured", 500);
  const keywords = input.q.trim();
  if (keywords.length < 1) throw new ApiError("q must be at least 1 character", 400);

  const url = new URL("https://restapi.amap.com/v3/config/district");
  url.searchParams.set("key", config.amapServiceKey);
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("subdistrict", "0");
  url.searchParams.set("extensions", "base");

  const payload = await fetchAmap(url);
  const districts = Array.isArray(payload.districts) ? payload.districts : [];
  return districts
    .map(normalizeCity)
    .filter((item): item is CitySearchItem => Boolean(item))
    .slice(0, 8);
}

export async function planDrivingRoute(input: {
  origin: LocationPoint;
  destination: LocationPoint;
  waypoints: LocationPoint[];
}): Promise<RoutePlan> {
  if (!config.amapServiceKey) throw new ApiError("AMAP_SERVICE_KEY is not configured", 500);

  const url = new URL("https://restapi.amap.com/v3/direction/driving");
  url.searchParams.set("key", config.amapServiceKey);
  url.searchParams.set("origin", toLngLat(input.origin));
  url.searchParams.set("destination", toLngLat(input.destination));
  url.searchParams.set("strategy", "10");
  url.searchParams.set("extensions", "all");
  if (input.waypoints.length > 0) {
    url.searchParams.set("waypoints", input.waypoints.map(toLngLat).join(";"));
  }

  const payload = await fetchAmap(url);
  const route = asRecord(payload.route);
  if (!route) throw new ApiError("AMap route not found", 502, payload);
  const paths = Array.isArray(route.paths) ? route.paths : [];
  const path = asRecord(paths[0]);
  if (!path) throw new ApiError("AMap route path not found", 502, payload);

  return {
    distanceMeters: numberValue(path.distance),
    durationSeconds: numberValue(path.duration),
    polyline: parseAmapStepsPolyline(path.steps),
    steps: parseAmapRouteSteps(path.steps),
  };
}

async function fetchAmap(url: URL): Promise<Record<string, unknown>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(`AMap request failed: HTTP ${response.status}`, response.status, payload);
  }
  if (!payload || typeof payload !== "object") {
    throw new ApiError("AMap response is not an object", 502);
  }
  const record = payload as Record<string, unknown>;
  if (record.status !== "1") {
    throw new ApiError(String(record.info || "AMap API returned failure"), 502, record);
  }
  return record;
}

function normalizePoi(value: unknown): PoiSearchItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const [lngText, latText] = String(record.location ?? "").split(",");
  const lng = Number(lngText);
  const lat = Number(latText);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  return {
    id: String(record.id ?? `${lng},${lat}`),
    poiId: String(record.id ?? ""),
    name: String(record.name ?? ""),
    address: normalizeText(record.address),
    lng,
    lat,
    city: normalizeText(record.cityname),
    province: normalizeText(record.pname),
    adcode: normalizeText(record.adcode),
    source: "amap",
  };
}

function normalizeCity(value: unknown): CitySearchItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = normalizeText(record.name);
  const adcode = normalizeText(record.adcode);
  if (!name || !adcode) return null;

  return {
    id: adcode,
    name,
    adcode,
    citycode: normalizeText(record.citycode),
    level: normalizeText(record.level),
    source: "amap",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeText(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toLngLat(point: LocationPoint) {
  return `${point.lng},${point.lat}`;
}

function parseAmapRouteSteps(steps: unknown): RouteStep[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((step) => {
      const record = asRecord(step);
      if (!record) return null;
      const polyline = parseAmapStepsPolyline([record]);
      const trafficStatus = extractTrafficStatus(record);
      return {
        road: normalizeText(record.road),
        instruction: normalizeText(record.instruction),
        distanceMeters: numberValue(record.distance),
        durationSeconds: numberValue(record.duration),
        polyline,
        ...(trafficStatus ? { trafficStatus } : {}),
      };
    })
    .filter((step): step is RouteStep => Boolean(step));
}

function extractTrafficStatus(step: Record<string, unknown>) {
  const tmcs = Array.isArray(step.tmcs) ? step.tmcs : [];
  const statuses = tmcs
    .map((tmc) => asRecord(tmc)?.status)
    .map((status) => normalizeText(status))
    .filter(Boolean);
  return statuses[0] ?? "";
}
