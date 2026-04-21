import { basename, dirname, resolve } from "node:path";

import glob from "fast-glob";
import type { TestProjectConfiguration } from "vitest/config";
import { defineConfig } from "vitest/config";

// Vitest bundles this config into node_modules/.vite-temp/, which rewrites
// import.meta.url. Use process.cwd() instead so the glob resolves from the
// repo root regardless of where vitest is loading the config from.
const root = process.cwd();

// `ci:prod` sets STARBEAM_TEST_PROD=1; that flips the env vars vitest's
// import.meta.env proxy reads, which is the only way to actually make
// `import.meta.env.DEV === false` at runtime (vitest's own --mode
// production doesn't; see vitest#5525). Without this, `ci:prod` was
// running exactly the same code paths as `ci:specs`.
const isProd = process.env["STARBEAM_TEST_PROD"] === "1";
const env: Record<string, string> = {
  ...(process.env["STARBEAM_TRACE"] ? { STARBEAM_TRACE: "true" } : {}),
  ...(isProd
    ? { PROD: "1", DEV: "", MODE: "production", NODE_ENV: "production" }
    : {}),
};

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
