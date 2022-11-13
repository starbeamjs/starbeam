import { dirname, resolve } from "node:path";

import { Package } from "@starbeam-dev/build-support";
import glob from "fast-glob";

const root = Package.root(import.meta);

export default glob
  .sync([resolve(root, "packages/*/*/package.json")])
  .flatMap((path) => {
    return Package.config(dirname(path));
  });
