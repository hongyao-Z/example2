import { Router } from "express";
import { saveSession } from "../db/repositories.js";
import { compareItineraries } from "../services/itineraryService.js";

export const itinerariesRouter = Router();

itinerariesRouter.post("/compare", async (request, response, next) => {
  try {
    const result = await compareItineraries(request.body);
    response.json(await saveSession(result));
  } catch (error) {
    next(error);
  }
});
