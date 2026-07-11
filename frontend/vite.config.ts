import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: frontendRoot,
  envDir: resolve(frontendRoot, ".."),
  server: {
    host: "127.0.0.1",
    allowedHosts: true,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
