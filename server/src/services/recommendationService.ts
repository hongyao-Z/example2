import type { BestResult, ItineraryCandidate, RecommendReason, Strategy } from "../types.js";

const DURATION_TIE_THRESHOLD_SECONDS = 3 * 60;

export function rankCandidates(
  candidates: ItineraryCandidate[],
  strategy: Strategy = "time_first",
): {
  candidates: ItineraryCandidate[];
  best: BestResult | null;
} {
  const normalized = candidates.map((candidate) =>
    normalizeCandidate({
      ...candidate,
      source: { route: "amap" },
    }),
  );

  const comparableCandidates = normalized.filter((candidate) => candidate.status === "ok");
  const activeReason = selectReason(comparableCandidates, strategy);

  const ranked = [...normalized].sort((a, b) => {
    const statusDiff = statusRank(a) - statusRank(b);
    if (statusDiff !== 0) return statusDiff;
    return compareByReason(a, b, activeReason, strategy) || a.id.localeCompare(b.id);
  });

  const candidatesWithReason = ranked.map((candidate) => ({
    ...candidate,
    recommendReason: candidate.status === "ok" ? activeReason : candidate.recommendReason,
  }));

  const bestCandidate = candidatesWithReason.find((candidate) => candidate.status === "ok") ?? null;

  return {
    candidates: candidatesWithReason,
    best: bestCandidate
      ? {
          id: bestCandidate.id,
          reason: activeReason,
          message: messageForReason(activeReason),
        }
      : null,
  };
}

function selectReason(candidates: ItineraryCandidate[], strategy: Strategy): RecommendReason {
  if (strategy === "price_first" && hasCompleteComparablePrices(candidates)) return "price_first";
  if (strategy === "distance_first") return "distance_tiebreaker";
  return selectRouteMetricReason(candidates);
}

function compareByReason(
  a: ItineraryCandidate,
  b: ItineraryCandidate,
  reason: RecommendReason,
  strategy: Strategy,
) {
  if (reason === "price_first") {
    return priceValue(a) - priceValue(b);
  }
  if (strategy === "distance_first") {
    return a.distanceMeters - b.distanceMeters || a.durationSeconds - b.durationSeconds;
  }
  return routeMetricCompare(a, b);
}

function priceValue(candidate: ItineraryCandidate) {
  return Number.isFinite(candidate.manualPrice?.price)
    ? Number(candidate.manualPrice?.price)
    : Number.POSITIVE_INFINITY;
}

function hasCompleteComparablePrices(candidates: ItineraryCandidate[]) {
  if (candidates.length === 0) return false;
  const productType = candidates[0].manualPrice?.productType;
  if (!productType) return false;
  return candidates.every(
    (candidate) =>
      candidate.manualPrice?.productType === productType &&
      Number.isFinite(candidate.manualPrice.price) &&
      candidate.manualPrice.price > 0,
  );
}

function routeMetricCompare(a: ItineraryCandidate, b: ItineraryCandidate) {
  const durationDiff = a.durationSeconds - b.durationSeconds;
  if (Math.abs(durationDiff) >= DURATION_TIE_THRESHOLD_SECONDS) return durationDiff;
  return a.distanceMeters - b.distanceMeters || durationDiff;
}

function selectRouteMetricReason(candidates: ItineraryCandidate[]): RecommendReason {
  if (candidates.length === 0) return "time_first";

  const ranked = [...candidates].sort((a, b) => routeMetricCompare(a, b) || a.id.localeCompare(b.id));
  const best = ranked[0];
  const hasCloseAlternative = candidates.some(
    (candidate) =>
      candidate.id !== best.id &&
      Math.abs(candidate.durationSeconds - best.durationSeconds) < DURATION_TIE_THRESHOLD_SECONDS,
  );

  return hasCloseAlternative ? "distance_tiebreaker" : "time_first";
}

function messageForReason(reason: RecommendReason) {
  if (reason === "price_first") return "用户录入的同车型价格更低，优先推荐";
  if (reason === "distance_tiebreaker") return "预计用时接近，选择路线距离更短的方案";
  return "预计用时最短，优先推荐";
}

function statusRank(candidate: ItineraryCandidate) {
  return candidate.status === "ok" ? 0 : 1;
}

function normalizeCandidate(candidate: ItineraryCandidate): ItineraryCandidate {
  return {
    ...candidate,
    steps: candidate.steps ?? [],
    recommendReason: candidate.recommendReason ?? "time_first",
  };
}
