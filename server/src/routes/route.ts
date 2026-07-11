import { Router } from "express";
import { parseAmapPolylineText } from "../core/polyline.js";
import { validateLocationPoint } from "../core/validation.js";
import { planDrivingRoute } from "../services/amapService.js";
import { ApiError } from "../types.js";

export const routeRouter = Router();

routeRouter.get("/", async (request, response, next) => {
  try {
    const origin = parsePointQuery(request.query.origin, "origin");
    const destination = parsePointQuery(request.query.destination, "destination");
    const waypoints = String(request.query.waypoints ?? "")
      .split(";")
      .filter(Boolean)
      .map((item, index) => parsePointQuery(item, `waypoints[${index}]`));
    const route = await planDrivingRoute({ origin, destination, waypoints });
    response.json({
      distance: route.distanceMeters,
      duration: route.durationSeconds,
      polyline: route.polyline,
      steps: route.steps,
    });
  } catch (error) {
    next(error);
  }
});

function parsePointQuery(value: unknown, label: string) {
  if (typeof value !== "string") throw new ApiError(`${label} is required`, 400);
  const [point] = parseAmapPolylineText(value);
  if (!point) throw new ApiError(`${label} must be lng,lat`, 400);
  return validateLocationPoint(
    { id: label, name: label, lng: point[0], lat: point[1] },
    label,
  );
}
