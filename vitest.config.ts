import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/dataset-ingestion/tests/**/*.test.ts"]
  }
});
