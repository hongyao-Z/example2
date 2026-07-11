import { permutations } from "../core/permutations.js";
import { validateCompareRequest } from "../core/validation.js";
import { planDrivingRoute } from "./amapService.js";
import { rankCandidates } from "./recommendationService.js";
import {
  ApiError,
  type CompareRequest,
  type ItineraryCandidate,
  type LocationPoint,
  type SessionResult,
  type Strategy,
} from "../types.js";

const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const routeCache = new Map<
  string,
  {
    expiresAt: number;
    candidates: ItineraryCandidate[];
  }
>();

export async function compareItineraries(input: unknown): Promise<{
  origin: LocationPoint;
  points: LocationPoint[];
  strategy: Strategy;
  candidates: ItineraryCandidate[];
  best: SessionResult["best"];
}> {
  const request = validateCompareRequest(input);
  const routeCacheKey = buildRouteCacheKey(request);
  const cached = routeCache.get(routeCacheKey);
  const candidates =
    cached && cached.expiresAt > Date.now()
      ? cloneCandidates(cached.candidates)
      : await buildCandidatesWithCache(request, routeCacheKey);

  const candidatesWithPrices = attachManualPrices(candidates, request.manualPrices);

  const successCount = candidatesWithPrices.filter((candidate) => candidate.status === "ok").length;
  if (successCount === 0) {
    throw new ApiError("all route candidates failed", 500, candidatesWithPrices);
  }

  const ranked = rankCandidates(candidatesWithPrices, request.strategy ?? "time_first");
  return {
    origin: request.origin,
    points: request.points,
    strategy: request.strategy ?? "time_first",
    candidates: ranked.candidates,
    best: ranked.best,
  };
}

function generateOrders(request: CompareRequest) {
  if (request.fixedFinalDestination && request.points.length > 1) {
    const finalPoint = request.points[request.points.length - 1];
    const middlePoints = request.points.slice(0, -1);
    return permutations(middlePoints).map((orderedPoints) => [
      request.origin,
      ...orderedPoints,
      finalPoint,
    ]);
  }
  return permutations(request.points).map((orderedPoints) => [request.origin, ...orderedPoints]);
}

async function buildCandidatesWithCache(request: CompareRequest, cacheKey: string) {
  const candidates = await Promise.all(
    generateOrders(request).map((places) => buildCandidate(request.origin, places)),
  );
  routeCache.set(cacheKey, {
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    candidates: cloneCandidates(candidates),
  });
  return candidates;
}

function attachManualPrices(
  candidates: ItineraryCandidate[],
  manualPrices: CompareRequest["manualPrices"],
) {
  if (!manualPrices) return candidates;
  return candidates.map((candidate) => ({
    ...candidate,
    manualPrice: manualPrices[candidate.id],
  }));
}

function buildRouteCacheKey(request: CompareRequest) {
  return JSON.stringify({
    origin: cachePoint(request.origin),
    points: request.points.map(cachePoint),
    fixedFinalDestination: Boolean(request.fixedFinalDestination),
  });
}

function cachePoint(point: LocationPoint) {
  return {
    id: point.id,
    lng: point.lng,
    lat: point.lat,
  };
}

function cloneCandidates(candidates: ItineraryCandidate[]) {
  return candidates.map((candidate) => ({
    ...candidate,
    places: candidate.places.map((place) => ({ ...place })),
    polyline: candidate.polyline.map((point) => [...point] as [number, number]),
    steps: candidate.steps.map((step) => ({
      ...step,
      polyline: step.polyline.map((point) => [...point] as [number, number]),
    })),
  }));
}

async function buildCandidate(
  origin: LocationPoint,
  places: LocationPoint[],
): Promise<ItineraryCandidate> {
  const id = places.map((place) => place.id).join("-");
  try {
    const route = await planDrivingRoute({
      origin,
      destination: places[places.length - 1],
      waypoints: places.slice(1, -1),
    });
    return {
      id,
      order: places.map((place) => place.id),
      places,
      distanceMeters: route.distanceMeters,
      distanceKm: round(route.distanceMeters / 1000, 1),
      durationSeconds: route.durationSeconds,
      durationMin: Math.max(1, Math.round(route.durationSeconds / 60)),
      polyline: route.polyline,
      steps: route.steps,
      recommendReason: "time_first",
      source: { route: "amap" },
      status: "ok",
    };
  } catch (error) {
    return {
      id,
      order: places.map((place) => place.id),
      places,
      distanceMeters: 0,
      distanceKm: 0,
      durationSeconds: 0,
      durationMin: 0,
      polyline: [],
      steps: [],
      recommendReason: "time_first",
      source: { route: "amap" },
      status: "failed",
      error: error instanceof Error ? error.message : "route planning failed",
    };
  }
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
