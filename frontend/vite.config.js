import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = (process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_URL || "http://localhost:4000")
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
      "/uploads": apiProxyTarget,
    },
  },
});
