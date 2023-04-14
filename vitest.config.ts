/// <reference types="vitest" />
import { defineConfig } from "vite";

const env = process.env["STARBEAM_TRACE"] ? { STARBEAM_TRACE: "true" } : {};

export default defineConfig({
  test: {
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
