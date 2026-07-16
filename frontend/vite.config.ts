/**
 * Vite configuration.
 * Purpose: dev server + build config, path alias (@/ -> src/), React plugin.
 * Used by: `npm run dev` / `npm run build`.
 *
 * NOTE: Scaffold placeholder only - fill in path alias resolution and
 * proxy rules to the backend during Milestone 0/2.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // "/api": "http://localhost:8000",
    },
  },
});
