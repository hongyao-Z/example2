import { Router } from "express";
import { getSession, listSessions } from "../db/repositories.js";
import { ApiError } from "../types.js";

export const sessionsRouter = Router();

sessionsRouter.get("/", async (_request, response, next) => {
  try {
    response.json({ items: await listSessions() });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get("/:sessionId", async (request, response, next) => {
  try {
    const session = await getSession(request.params.sessionId);
    if (!session) throw new ApiError("session not found", 404);
    response.json(session);
  } catch (error) {
    next(error);
  }
});
