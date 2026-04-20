import { basename, dirname, resolve } from "node:path";

import glob from "fast-glob";
import type { TestProjectConfiguration } from "vitest/config";
import { defineConfig } from "vitest/config";

// Vitest bundles this config into node_modules/.vite-temp/, which rewrites
// import.meta.url. Use process.cwd() instead so the glob resolves from the
// repo root regardless of where vitest is loading the config from.
const root = process.cwd();

const env = process.env["STARBEAM_TRACE"] ? { STARBEAM_TRACE: "true" } : {};

const projects: TestProjectConfiguration[] = glob
  .sync([
    resolve(root, "packages/universal/*/package.json"),
    resolve(root, "packages/preact/*/package.json"),
    resolve(root, "packages/vue/*/package.json"),
    resolve(root, "packages/react/*/package.json"),
    resolve(root, "workspace/*/package.json"),
    resolve(root, "demos/react-jsnation/package.json"),
  ])
  .filter((manifest) => !manifest.includes("dev-compile"))
  .map((manifest) => {
    const path = dirname(manifest);

    return {
      // Inherit root options (env, isolate, maxWorkers) rather than
      // referencing this file back, which would infinite-loop.
      extends: true,
      test: {
        name: projectName(path),
        include: [resolve(path, "tests/**/*.spec.ts")],
        includeSource: [resolve(path, "src/**/*.ts")],

        typecheck: {
          enabled: true,
        },

        exclude: [
          resolve(path, "tests/node_modules/**"),
          resolve(path, "tests/.fixtures/**"),
        ],
        environment: "node",
      },
    };
  });

export default defineConfig({
  root: "./",
  test: {
    name: "Starbeam",
    env,

    // Serialize the suite. Several preact/vue tests are timing-sensitive
    // around framework schedulers and time out when multiple workers run
    // concurrently. The singleFork/maxWorkers:1 workaround was removed in
    // the #162 infra arc on the theory that vitest 4's pool rewrite had
    // fixed the race — but that only appeared to be true because the
    // `describeInDev` bug was silently skipping ~80 react tests, halving
    // the concurrent load. With describeInDev fixed, the race returns
    // under default parallelism and causes ~8 timeouts in preact/vue
    // tests that pass in isolation.
    //
    // TODO: find and fix the actual race in the preact/vue adapters
    // (likely around scheduler/microtask timing), then remove this.
    //
    // In vitest 4, poolOptions.forks.singleFork was replaced by top-level
    // isolate:false + maxWorkers:1.
    isolate: false,
    maxWorkers: 1,

    projects,
  },
});

function projectName(manifest: string): string {
  const base = basename(manifest);
  const parent = basename(dirname(manifest));

  if (parent === "workspace") {
    return `workspace:${base}`;
  } else {
    return base;
  }
}
