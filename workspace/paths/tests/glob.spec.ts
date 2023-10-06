import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { WorkspaceRoot } from "@starbeam-workspace/paths";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "@starbeam-workspace/test-utils";
import type { Structure } from "fsify";
import createFsify from "fsify";

const testRoot = await mkdtemp(join(tmpdir(), "starbeam-paths"), {
  encoding: "utf-8",
});
const fsify = createFsify({ cwd: testRoot, persistent: true });

describe("Glob", () => {
  beforeAll(async () => {
    await fsify(
      Tree({
        core: {
          src: {
            "main.ts": "file",
            "utils.ts": "file",
            reactive: {
              "cell.ts": "file",
              "formula.ts": "file",
              "collection.ts": "file",
            },
          },
          tests: {
            support: {
              "format.ts": "file",
            },
            "cell.spec.ts": "file",
            "formula.spec.ts": "file",
            "collection.spec.ts": "file",
            "package.json": "file",
            ".eslintrc.json": "file",
            "tsconfig.json": "file",
          },
          "index.ts": "file",
          "package.json": "file",
          ".eslintrc.json": "file",
          "tsconfig.json": "file",
        },
      }),
    );
  });

  afterAll(async () => {
    await fsify.cleanup();
  });

  const workspace = WorkspaceRoot.at(testRoot);

  test("Glob", () => {
    const manifests = workspace.glob("./core/package.json");

    expect(manifests.expand().map((path) => path.absolute)).toEqual([
      join(testRoot, "core/package.json"),
    ]);
  });
});

type TreeNode = Tree | "file";
// eslint-disable-next-line @typescript-eslint/no-type-alias, @typescript-eslint/consistent-indexed-object-style
type Tree = { [key: string]: TreeNode | "file" };

function Tree(tree: Tree): Structure[] {
  return Object.entries(tree).map(([name, value]) => {
    if (typeof value === "string") {
      return {
        type: "file",
        name,
      };
    } else {
      return {
        type: "directory",
        name,
        contents: Tree(value),
      };
    }
  });
}
