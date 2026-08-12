import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev-only: production traffic goes through Nginx.
      "/api": { target: process.env.CLERKOS_API_URL || "http://localhost:8000", changeOrigin: false },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});
