import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"]
  }
});
