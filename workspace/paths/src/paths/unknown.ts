import { DiskFile } from "../paths/regular.js";
import type { PathData } from "../workspace.js";

export class UnknownFile extends DiskFile {
  readonly [Symbol.toStringTag] = "UnknownFile";

  create(data: PathData): UnknownFile {
    return new UnknownFile(this.workspace, data);
  }
}
