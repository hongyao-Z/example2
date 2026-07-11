export type Strategy = "time_first" | "distance_first" | "balanced" | "price_first";

export type LocationPoint = {
  id: string;
  name: string;
  address?: string;
  lng: number;
  lat: number;
};

export type PoiSearchItem = LocationPoint & {
  source: "amap";
  poiId?: string;
  city?: string;
  province?: string;
  adcode?: string;
};

export type CitySearchItem = {
  id: string;
  name: string;
  adcode: string;
  citycode?: string;
  level: string;
  province?: string;
  source: "amap";
};

export type PolylinePoint = [number, number];

export type RouteStep = {
  road: string;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: PolylinePoint[];
  trafficStatus?: string;
};

export type RoutePlan = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: PolylinePoint[];
  steps: RouteStep[];
};

export type CandidateSource = {
  route: "amap";
};

export type ItineraryCandidate = {
  id: string;
  order: string[];
  places: LocationPoint[];
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMin: number;
  polyline: PolylinePoint[];
  steps: RouteStep[];
  recommendReason: RecommendReason;
  source: CandidateSource;
  status: "ok" | "failed";
  error?: string;
  manualPrice?: ManualPrice;
};

export type BestResult = {
  id: string;
  reason: RecommendReason;
  message: string;
};

export type RecommendReason = "price_first" | "time_first" | "distance_tiebreaker";

export type ManualPrice = {
  productType: string;
  price: number;
  updatedAt: string;
};

export type CompareRequest = {
  origin: LocationPoint;
  points: LocationPoint[];
  strategy?: Strategy;
  fixedFinalDestination?: boolean;
  manualPrices?: Record<string, ManualPrice>;
};

export type SessionResult = {
  sessionId: string;
  generatedAt: string;
  updatedAt: string;
  strategy: Strategy;
  origin: LocationPoint;
  points: LocationPoint[];
  candidates: ItineraryCandidate[];
  best: BestResult | null;
  shareUrl: string;
};

export type HealthResult = {
  ok: true;
  service: "multi-stop-route-decision-api";
  time: string;
  amapConfigured: boolean;
  database: "postgres" | "sqlite";
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}
