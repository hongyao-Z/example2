import cors from "cors";
import express from "express";
import { config, printConfigStatus } from "./config.js";
import { ensureDatabase } from "./db/migrations.js";
import { ApiError } from "./types.js";
import { healthRouter } from "./routes/health.js";
import { itinerariesRouter } from "./routes/itineraries.js";
import { manualPriceRouter } from "./routes/manualPrice.js";
import { placesRouter } from "./routes/places.js";
import { routeRouter } from "./routes/route.js";
import { sessionsRouter } from "./routes/sessions.js";
import { shareRouter } from "./routes/share.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = resolveAllowedOrigins();
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError("cors origin is not allowed", 403));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use("/api/places", placesRouter);
app.use("/api/itineraries", itinerariesRouter);
app.use("/api/price", manualPriceRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/share", shareRouter);
app.use("/api/route", routeRouter);

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    void _next;
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(error instanceof Error ? error.message : "internal server error", 500);
    response.status(apiError.status).json({
      error: apiError.message,
      details: apiError.details,
    });
  },
);

await ensureDatabase();

app.listen(config.port, config.host, () => {
  printConfigStatus();
  console.log(`API listening on http://${config.host}:${config.port}`);
});

function resolveAllowedOrigins() {
  const configured = config.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (config.nodeEnv === "production") {
    return configured;
  }

  return [
    ...configured,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5180",
    "http://localhost:5180",
  ];
}
