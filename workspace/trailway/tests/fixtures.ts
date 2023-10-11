import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import createFsify, { type Structure } from "fsify";

const __dirname = new URL(".", import.meta.url).pathname;

const testRoot = join(__dirname, ".fixtures");
await mkdir(testRoot, {
  recursive: true,
});
const fsify = createFsify({ cwd: testRoot });

await fsify(
  Tree({
    workspace: {
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
    },
  }),
);

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
