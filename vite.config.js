// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/WAREHOUSE-Improvement/", // Must match your repo name exactly with slashes
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  // Three.js is a standard ESM package — no special config needed
});
