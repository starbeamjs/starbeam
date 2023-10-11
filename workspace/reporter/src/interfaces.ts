import type { ExecSyncOptionsWithStringEncoding } from "node:child_process";

import type { Directory, WorkspacePath } from "trailway";

import type { CommandOutputType } from "./command-stream.js";
import type { Reporter } from "./reporter.js";

export interface Workspace {
  reporter: Reporter;
  root: Directory;
  exec: WorkspaceExec;
  cmd: WorkspaceCmd;
  paths: WorkspacePath;
}

type WorkspaceCmd = (
  command: string,
  options?: Partial<ExecSyncOptionsWithStringEncoding & { failFast: boolean }>
) => string | void;

type WorkspaceExec = (
  command: string,
  options?: {
    cwd: string;
    label: string;
    output?: CommandOutputType;
    breakBefore: boolean;
  }
) => Promise<"ok" | "err">;
