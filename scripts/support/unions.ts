import type { Directory } from "./paths.js";
import { Union } from "./type-magic.js";

const X = 1;

export class StarbeamType extends Union(
  "interfaces",
  "library",
  "support:tests",
  "support:build",
  "demo:react",
  "unknown",
  "draft",
  "none"
) {}

export class TemplateName extends Union(
  "interfaces.package.json",
  "npmrc",
  "package.json",
  "rollup.config.mjs",
  "tsconfig.json"
) {
  read(root: Directory): string {
    return root.file(`scripts/templates/package/${this}.template`).readSync();
  }
}
