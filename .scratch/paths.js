import { relative } from "node:path";

const CASES = [
  ["/a/b", "/a/b/c"], // "c"
  ["/a/b/c", "/a/b/c"], // ""
  ["/a/b/c", "/a/b"], // ".."
  ["/a/b/c", "/d/e/f"], // "../../../d/e/f"
  ["/a/b/c", "/a/b/d"], // "../d"
  ["/a/b/c", "/a/b/d/e/f"], // "../d/e/f"
];

for (const [a, b] of CASES) {
  console.log(`relative(${a}, ${b}): ${JSON.stringify(relative(a, b))}`);
}
