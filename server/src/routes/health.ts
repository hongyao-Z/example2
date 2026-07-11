import { Router } from "express";
import { config } from "../config.js";
import type { HealthResult } from "../types.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  const payload: HealthResult = {
    ok: true,
    service: "multi-stop-route-decision-api",
    time: new Date().toISOString(),
    amapConfigured: Boolean(config.amapServiceKey),
    database: config.databaseUrl ? "postgres" : "sqlite",
  };
  response.json(payload);
});
