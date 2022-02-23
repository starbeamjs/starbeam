import * as path from "path";
import { exec } from "shelljs";

let root = __dirname;

let packages = String(
  exec("pnpm m ls --depth -1 --porcelain", { silent: true })
)
  .split("\n")
  .filter((file) => file !== "" && file !== root)
  .map((p) => path.relative(root, p));
// .map((p) => `${p}`);

console.log(packages);
