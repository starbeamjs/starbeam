import type { Package } from "@starbeam-workspace/package";
import type { Directory } from "@starbeam-workspace/paths";
import type { Path } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";

import scripts from "../scripts.json";

interface Script {
  command: string;
  cwd: string;
}

export interface Scripts {
  lint: Script;
  specs: Script;
  types: Script;
}

export default scripts as Scripts;

export function hydrateScript(
  script: Script,
  options: { workspace: Workspace; pkg: Package }
): { command: string; cwd: Directory } {
  const { command, cwd } = script;

  const replacements = {
    "${workspace.root}": options.workspace.root,
    "${package.root}": options.pkg.root,
  };

  return {
    command: replace(command, replacements),
    cwd: options.workspace.root.rootedChild(replace(cwd, replacements)),
  };
}

function replace(
  value: string,
  replacements: Record<string, string | Path>
): string {
  for (const [key, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(key, String(replacement));
  }

  return value;
}
