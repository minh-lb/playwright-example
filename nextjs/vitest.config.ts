import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "src/**/*.test.tsx"],
    fileParallelism: false,
    environment: "node",
  },
});
