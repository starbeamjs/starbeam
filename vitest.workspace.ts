import { basename, dirname, resolve } from "node:path";

import { Package } from "@starbeam-dev/build-support";
import glob from "fast-glob";
import { defineWorkspace, type UserWorkspaceConfig } from "vitest/config";

const root = Package.root(import.meta);

const packages = glob
  .sync([resolve(root, "packages/universal/*/package.json")])
  .map((manifest) => {
    const path = dirname(manifest);
    return {
      extends: "./vitest.config.ts",
      test: {
        name: basename(path),
        include: [resolve(path, "tests/**/*.{test,spec}.{js,ts}")],
        includeSource: [resolve(path, "src/**/*.{test,spec}.{js,ts}")],
        exclude: [resolve(path, "tests/node_modules/**")],
        environment: "node",
      },
    } satisfies UserWorkspaceConfig & { extends: string };
  });

export default defineWorkspace(packages);
