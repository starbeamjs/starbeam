import { basename, dirname, resolve } from "node:path";

import { rootAt } from "@starbeam-dev/core";
import glob from "fast-glob";
import type { UserWorkspaceConfig } from "vitest/config";
import { defineWorkspace } from "vitest/config";

const root = rootAt(import.meta);

const packages = glob
  .sync([
    resolve(root, "packages/universal/*/package.json"),
    resolve(root, "packages/preact/*/package.json"),
    resolve(root, "packages/vue/*/package.json"),
    resolve(root, "packages/react/*/package.json"),
    resolve(root, "workspace/*/package.json"),
    resolve(root, "demos/react-jsnation/package.json"),
  ])
  .filter(manifest => !manifest.includes('dev-compile'))
  .map((manifest) => {
    const path = dirname(manifest);

    return {
      extends: "./vitest.config.mts",
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
    } satisfies UserWorkspaceConfig & { extends: string };
  });

export default defineWorkspace(packages);

function projectName(manifest: string): string {
  const base = basename(manifest);
  const parent = basename(dirname(manifest));

  if (parent === "workspace") {
    return `workspace:${base}`;
  } else {
    return base;
  }
}
