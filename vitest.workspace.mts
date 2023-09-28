import { basename, dirname, resolve } from "node:path";

import { Package } from "@starbeam-dev/build-support";
import glob from "fast-glob";
import { defineWorkspace } from "vitest/config";

const root = Package.root(import.meta);

const packages = glob
  .sync([
    resolve(root, "packages/universal/*/package.json"),
    resolve(root, "packages/preact/*/package.json"),
    resolve(root, "packages/vue/*/package.json"),
    resolve(root, "packages/react/*/package.json"),
    resolve(root, "workspace/*/package.json"),  
    resolve(root, "demos/react-jsnation/package.json"),
  ])
  .map((manifest) => {
    const path = dirname(manifest);
    /**
     * @satisfies {import("vitest/config").UserWorkspaceConfig & { extends: string }}
     */
    return {
      extends: "./vitest.config.mts",
      test: {
        name: projectName(path),
        include: [resolve(path, "tests/**/*.spec.ts")],
        includeSource: [resolve(path, "src/**/*.ts")],
        exclude: [resolve(path, "tests/node_modules/**")],
        environment: "node",
      },
    };
  });

export default defineWorkspace(packages);

function projectName(manifest: string): string {
  const base = basename(manifest);
  const parent = basename(dirname(manifest));

  if (parent === 'workspace') {
    return `workspace:${base}`;
  } else {
    return base;
  }
}