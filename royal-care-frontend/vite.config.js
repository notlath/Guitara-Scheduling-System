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
  resolve: {
    // Fix emotion/react duplicate loading issue and React duplicate instances
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    alias: {
      // Ensure single React instance
      react: "react",
      "react-dom": "react-dom",
    },
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
