import { defineConfig } from "vitest/config";

const env = process.env["STARBEAM_TRACE"] ? { STARBEAM_TRACE: "true" } : {};

export default defineConfig({
  test: {
    name: "Starbeam",
    env,
  },
});
