import { defineConfig } from "vitest/config";

const env = process.env["STARBEAM_TRACE"] ? { STARBEAM_TRACE: "true" } : {};

export default defineConfig({
  root: "./",
  test: {
    name: "Starbeam",

    env,

    // Several preact/vue tests are timing-sensitive around framework
    // schedulers and can time out when multiple fork workers run
    // concurrently. Vitest 1 apparently serialized them; vitest 3's
    // fork pool is more aggressive. Serialize forks until the
    // underlying timing issue is investigated.
    //
    // TODO: find and fix the actual race in the preact/vue adapters,
    // then remove this.
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
