import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  optimizeDeps: {
    include: ["react-easy-crop", "tslib"],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Don't externalize tslib - it should be bundled
        if (id === "tslib") return false;
        return false;
      },
    },
  },
});
