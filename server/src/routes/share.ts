import { Router } from "express";
import { getSession } from "../db/repositories.js";
import { ApiError } from "../types.js";

export const shareRouter = Router();

shareRouter.get("/:sessionId", async (request, response, next) => {
  try {
    const session = await getSession(request.params.sessionId);
    if (!session) throw new ApiError("shared session not found", 404);
    response.json(session);
  } catch (error) {
    next(error);
  }
});
