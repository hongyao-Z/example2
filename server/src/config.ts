import path from "node:path";
import dotenv from "dotenv";

for (const envFile of [
  path.resolve(process.cwd(), "server", ".env"),
  path.resolve(process.cwd(), ".env.local"),
]) {
  dotenv.config({ path: envFile, override: false, quiet: true });
}

export const config = {
  port: Number(process.env.PORT || 8787),
  nodeEnv: process.env.NODE_ENV || "development",
  host:
    process.env.HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  corsOrigin: process.env.CORS_ORIGIN || "",
  amapServiceKey: process.env.AMAP_SERVICE_KEY?.trim() || "",
  databaseUrl: process.env.DATABASE_URL?.trim() || "",
};

export function printConfigStatus() {
  console.log(
    JSON.stringify({
      service: "multi-stop-route-decision-api",
      port: config.port,
      host: config.host,
      nodeEnv: config.nodeEnv,
      corsOrigin: config.corsOrigin,
      amapConfigured: Boolean(config.amapServiceKey),
      database: config.databaseUrl ? "postgres" : "sqlite",
    }),
  );
}
