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
  css: {
    modules: {
      // Generate shorter class names in development for better debugging
      generateScopedName: "[name]__[local]___[hash:base64:5]",
      // Only include CSS modules when they're actually imported
      localsConvention: "camelCase",
    },
    // Enable code splitting only for CSS modules, not regular CSS
    codeSplit: true,
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Don't externalize tslib - it should be bundled
        if (id === "tslib") return false;
        return false;
      },
      output: {
        // Split CSS into separate chunks per route/component
        manualChunks: (id) => {
          // Only split CSS modules from lazy-loaded pages, not component CSS
          if (id.includes(".module.css")) {
            // Only split page-level CSS modules, not component-level ones
            if (id.includes("/pages/")) {
              const match = id.match(/\/pages\/([^/]+)\/[^/]+\.module\.css$/);
              if (match) {
                return `${match[1]}-styles`;
              }
            }
          }
          // Keep all regular CSS files in the main bundle for now
          // This ensures dashboard component styles load immediately
        },
      },
    },
  },
});
