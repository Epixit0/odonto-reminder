import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    globals: true,
    include: ["tests/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.js", "models/**/*.js"],
      exclude: ["lib/logger.js"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@//lib": path.resolve(__dirname, "./lib"),
      "@//models": path.resolve(__dirname, "./models"),
      "@//components": path.resolve(__dirname, "./components"),
      "@/locales": path.resolve(__dirname, "./locales"),
    },
  },
});
