import { isAbsolute } from "path/posix";

import { join } from "../utils.js";
import type { PathData, WorkspacePath } from "../workspace";
import { Path } from "./abstract.js";
import type { GlobOptions } from "./glob";
import { Globs } from "./glob";
import type { RegularFile } from "./regular.js";
import { DiskFile } from "./regular.js";

export interface AsDirectory {
  expand: () => Directory;
}

export class Directory extends DiskFile implements AsDirectory {
  static rooted(workspace: WorkspacePath, path: string): Directory {
    const absolute = isAbsolute(path) ? path : join(workspace.absolute, path);
    return new Directory(workspace, {
      root: absolute,
      absolute,
    });
  }

  static root(workspace: WorkspacePath): Directory {
    return new Directory(workspace, {
      root: workspace.absolute,
      absolute: workspace.absolute,
    });
  }

  static {
    Object.defineProperty(Directory.prototype, Symbol.toStringTag, {
      value: "Directory",
    });
  }

  declare [Symbol.toStringTag]: "Directory";

  create(data: PathData): Directory {
    return new Directory(this.workspace, data);
  }

  globs(options: GlobOptions<["files"]>): Globs<RegularFile>;
  globs(options: GlobOptions<["directories"]>): Globs<Directory>;
  globs(options?: GlobOptions): Globs;
  globs(options?: GlobOptions): Globs {
    return Globs.root(this, options);
  }

  isRoot(): boolean {
    return Path.isRoot(this);
  }

  expand(): this {
    return this;
  }
}
