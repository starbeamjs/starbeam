import type { Directory } from "@starbeam-workspace/paths";
import { type CheckResult, Check } from "@starbeam-workspace/reporter";
import { CheckResults } from "@starbeam-workspace/reporter";

import type { CommandOutputType, Workspace } from "./workspace.js";

export interface ExecOptions {
  cwd: Directory;
  output?: CommandOutputType;
}

export class Checks {
  readonly #workspace: Workspace;
  readonly #root: Directory;
  readonly #statuses: Map<string, CheckResult>;

  constructor(workspace: Workspace, root: Directory) {
    this.#workspace = workspace;
    this.#root = root;
    this.#statuses = new Map();
  }

  get statuses(): CheckResults {
    return new CheckResults(this.#statuses);
  }

  async exec(
    label: string,
    command: string,
    { cwd = this.#root, output = "stream" }: Partial<ExecOptions> = {}
  ): Promise<CheckResult> {
    const check = new Check(label, command, { cwd, output });
    const result = await check.run(this.#workspace);
    this.#statuses.set(label, result);
    return result;
  }
}
