import type { PolylinePoint } from "../types.js";

export function parseAmapStepsPolyline(steps: unknown): PolylinePoint[] {
  if (!Array.isArray(steps)) return [];
  const points: PolylinePoint[] = [];

  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const polyline = String((step as Record<string, unknown>).polyline ?? "");
    points.push(...parseAmapPolylineText(polyline));
  }

  return points;
}

export function parseAmapPolylineText(polyline: string): PolylinePoint[] {
  const points: PolylinePoint[] = [];
  for (const pair of polyline.split(";")) {
    const [lngText, latText] = pair.split(",");
    const lng = Number(lngText);
    const lat = Number(latText);
    if (Number.isFinite(lng) && Number.isFinite(lat)) points.push([lng, lat]);
  }
  return points;
}
