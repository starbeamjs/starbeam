/**
 * This file exists to make it possible for multiple path files to cyclically
 * reference each other without running afoul of circular dependency issues in
 * JavaScript.
 *
 * Each of the path constructors takes a runtime and creates new instances of
 * other path types through it. The path files can still reference the other
 * path *types* directly, because types can be cyclic without problems.
 */

import { Directory } from "./paths/directory.js";
import { Glob } from "./paths/glob.js";
import { RegularFile } from "./paths/regular.js";
import { UnknownFile } from "./paths/unknown.js";
import { WorkspacePath,type WorkspacePathData } from "./workspace.js";

const FILE_TYPES = {
  RegularFile,
  UnknownFile,
  Directory,
  Glob,
} as const;

export type FILE_TYPES = typeof FILE_TYPES;
export type FileType = keyof FILE_TYPES;

export const RUNTIME = {
  ...FILE_TYPES,
  workspace(data: WorkspacePathData): WorkspacePath {
    return WorkspacePath.at(data.root);
  },
  get systemRoot() {
    return WorkspacePath.system;
  },
} as const;

export type Runtime = typeof RUNTIME;
