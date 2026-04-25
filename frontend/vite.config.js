import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("@stellar/stellar-sdk") ||
            id.includes("@stellar/freighter-api")
          ) {
            return "stellar-vendor";
          }
          if (id.includes("@sentry/")) {
            return "sentry-vendor";
          }
          if (id.includes("react") || id.includes("react-dom")) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
