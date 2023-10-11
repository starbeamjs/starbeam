import { statSync } from "fs";

import { DiskFile } from "../paths/regular.js";
import type { PathData } from "../workspace.js";

export class UnknownFile extends DiskFile {
  readonly [Symbol.toStringTag] = "UnknownFile";

  create(data: PathData): UnknownFile {
    return new UnknownFile(this.workspace, data);
  }

  reify(): DiskFile {
    const stat = statSync(this.absolute, { throwIfNoEntry: false });

    if (!stat) return this;

    if (stat.isDirectory()) {
      return this.build("Directory", {
        root: this.root.absolute,
        absolute: this.absolute,
      });
    } else if (stat.isFile()) {
      return this.build("RegularFile", {
        root: this.root.absolute,
        absolute: this.absolute,
      });
    } else {
      return this;
    }
  }
}
