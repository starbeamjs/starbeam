// @ts-check

import { Package } from "@starbeam-workspace/build-support";
import glob from "fast-glob";
import { dirname, resolve } from "node:path";

const root = Package.root(import.meta);

export default glob
  .sync([resolve(root, "packages/*/*/package.json")])
  .flatMap((path) => {
    return Package.config(dirname(path));
  });
