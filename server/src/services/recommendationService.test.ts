import assert from "node:assert/strict";
import { rankCandidates } from "./recommendationService.js";
import type { ItineraryCandidate } from "../types.js";

const distanceShortButSlow: ItineraryCandidate[] = [
  candidate("A-B-C", 20000, 3600),
  candidate("A-C-B", 28000, 2700),
];

const rankedByTime = rankCandidates(distanceShortButSlow);
assert.equal(rankedByTime.best?.id, "A-C-B");
assert.equal(rankedByTime.best?.reason, "time_first");
assert.equal(rankedByTime.best?.message, "预计用时最短，优先推荐");
assert.notEqual(rankedByTime.best?.id, "A-B-C");
assert.equal(rankedByTime.candidates[0].recommendReason, "time_first");

const timeCloseDistanceWins: ItineraryCandidate[] = [
  candidate("A-B-C", 9000, 2760),
  candidate("A-C-B", 12000, 2700),
];

const rankedByDistanceTiebreaker = rankCandidates(timeCloseDistanceWins);
assert.equal(rankedByDistanceTiebreaker.best?.id, "A-B-C");
assert.equal(rankedByDistanceTiebreaker.best?.reason, "distance_tiebreaker");
assert.equal(rankedByDistanceTiebreaker.best?.message, "预计用时接近，选择路线距离更短的方案");

const sameDurationCandidates: ItineraryCandidate[] = [
  candidate("A-B-C", 15000, 3000),
  candidate("A-C-B", 12000, 3000),
];

const rankedSameDuration = rankCandidates(sameDurationCandidates);
assert.equal(rankedSameDuration.best?.id, "A-C-B");
assert.equal(rankedSameDuration.best?.reason, "distance_tiebreaker");

const completePrices = [
  withPrice(candidate("A-B-C", 20000, 3600), 72),
  withPrice(candidate("A-C-B", 28000, 2700), 68),
];
const rankedByPrice = rankCandidates(completePrices, "price_first");
assert.equal(rankedByPrice.best?.id, "A-C-B");
assert.equal(rankedByPrice.best?.reason, "price_first");

const incompletePrices = [
  withPrice(candidate("A-B-C", 20000, 3600), 60),
  candidate("A-C-B", 28000, 2700),
];
const rankedWithIncompletePrices = rankCandidates(incompletePrices, "price_first");
assert.equal(rankedWithIncompletePrices.best?.id, "A-C-B");
assert.equal(rankedWithIncompletePrices.best?.reason, "time_first");

const failedCandidateRanking = rankCandidates([
  { ...candidate("A-B-C", 0, 0), status: "failed", error: "route failed" },
  candidate("A-C-B", 12000, 3000),
]);
assert.equal(failedCandidateRanking.best?.id, "A-C-B");
assert.equal(failedCandidateRanking.candidates[0].status, "ok");

console.log("recommendation tests passed");

function candidate(id: string, distanceMeters: number, durationSeconds: number): ItineraryCandidate {
  return {
    id,
    order: id.split("-"),
    places: id.split("-").map((place) => ({ id: place, name: place, lng: 116, lat: 39 })),
    distanceMeters,
    distanceKm: distanceMeters / 1000,
    durationSeconds,
    durationMin: Math.round(durationSeconds / 60),
    polyline: [],
    steps: [],
    recommendReason: "time_first",
    source: { route: "amap" },
    status: "ok",
  };
}

function withPrice(candidateValue: ItineraryCandidate, price: number): ItineraryCandidate {
  return {
    ...candidateValue,
    manualPrice: {
      productType: "快车型",
      price,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  };
}
