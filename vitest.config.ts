import { defineConfig } from "vitest/config";

const env = process.env["STARBEAM_TRACE"] ? { STARBEAM_TRACE: "true" } : {};

export default defineConfig({
  test: {
    name: "Starbeam",
    typecheck: {
      checker: "tsc",
    },
    includeSource: ["packages/*/*/src/**/*.ts"],
    exclude: [
      "**/node_modules/**",
      "demos/**",
      "**/dist/**",
      "workspace/scripts/src/**",
    ],
    env,
  },
});
