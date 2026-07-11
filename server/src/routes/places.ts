import { Router } from "express";
import { searchCities, searchPlaces } from "../services/amapService.js";

export const placesRouter = Router();

placesRouter.get("/cities", async (request, response, next) => {
  try {
    const q = String(request.query.q ?? "");
    const items = await searchCities({ q });
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

placesRouter.get("/search", async (request, response, next) => {
  try {
    const q = String(request.query.q ?? "");
    const city = String(request.query.city ?? "");
    const items = await searchPlaces({ q, city });
    response.json({ items });
  } catch (error) {
    next(error);
  }
});
