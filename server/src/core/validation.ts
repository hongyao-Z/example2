import {
  ApiError,
  type CompareRequest,
  type LocationPoint,
  type ManualPrice,
  type Strategy,
} from "../types.js";

export function validateLocationPoint(value: unknown, label: string): LocationPoint {
  if (!value || typeof value !== "object") throw new ApiError(`${label} is required`, 400);
  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const name = String(record.name ?? "").trim();
  const address = String(record.address ?? "").trim();
  const lng = Number(record.lng);
  const lat = Number(record.lat);

  if (!id) throw new ApiError(`${label}.id is required`, 400);
  if (!name) throw new ApiError(`${label}.name is required`, 400);
  if (!Number.isFinite(lng)) throw new ApiError(`${label}.lng is invalid`, 400);
  if (!Number.isFinite(lat)) throw new ApiError(`${label}.lat is invalid`, 400);

  return {
    id,
    name,
    address: address || undefined,
    lng,
    lat,
  };
}

export function validateCompareRequest(value: unknown): CompareRequest {
  if (!value || typeof value !== "object") throw new ApiError("request body is required", 400);
  const record = value as Record<string, unknown>;
  const origin = validateLocationPoint(record.origin, "origin");
  if (!Array.isArray(record.points) || record.points.length < 2) {
    throw new ApiError("points must contain at least two locations", 400);
  }
  if (record.points.length > 6) {
    throw new ApiError("points cannot exceed 6 locations in this MVP", 400);
  }

  return {
    origin,
    points: record.points.map((point, index) =>
      validateLocationPoint(point, `points[${index}]`),
    ),
    strategy: validateStrategy(record.strategy),
    fixedFinalDestination: Boolean(record.fixedFinalDestination),
    manualPrices: validateManualPrices(record.manualPrices),
  };
}

function validateStrategy(value: unknown): Strategy {
  if (
    value === "distance_first" ||
    value === "balanced" ||
    value === "price_first" ||
    value === "time_first"
  ) {
    return value;
  }
  return "time_first";
}

function validateManualPrices(value: unknown): Record<string, ManualPrice> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const output: Record<string, ManualPrice> = {};
  Object.entries(value as Record<string, unknown>).forEach(([candidateId, rawPrice]) => {
    if (!rawPrice || typeof rawPrice !== "object") return;
    const record = rawPrice as Record<string, unknown>;
    const price = Number(record.price);
    const productType = String(record.productType ?? "").trim();
    if (!candidateId || !Number.isFinite(price) || price <= 0 || !productType) return;
    output[candidateId] = {
      productType,
      price,
      updatedAt: String(record.updatedAt ?? new Date().toISOString()),
    };
  });
  return output;
}
