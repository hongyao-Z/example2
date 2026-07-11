import { Router } from "express";
import { updateCandidateManualPrice } from "../db/repositories.js";
import { ApiError } from "../types.js";

export const manualPriceRouter = Router();

manualPriceRouter.post("/manual", async (request, response, next) => {
  try {
    const sessionId = String(request.body?.sessionId ?? "").trim();
    const candidateId = String(request.body?.candidateId ?? "").trim();
    const productType = String(request.body?.productType ?? "").trim();
    const price = Number(request.body?.price);

    if (!sessionId) throw new ApiError("sessionId is required", 400);
    if (!candidateId) throw new ApiError("candidateId is required", 400);
    if (!productType) throw new ApiError("productType is required", 400);
    if (!Number.isFinite(price) || price <= 0) throw new ApiError("price is invalid", 400);

    const session = await updateCandidateManualPrice({
      sessionId,
      candidateId,
      productType,
      price,
    });
    if (!session) throw new ApiError("session not found", 404);
    response.json(session);
  } catch (error) {
    next(error);
  }
});
