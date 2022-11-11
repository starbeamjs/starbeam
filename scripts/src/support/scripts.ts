import scripts from "../scripts.json";
import type { Package } from "./packages.js";
import type { Directory } from "./paths.js";
import type { Path } from "./paths.js";
import type { Workspace } from "./workspace.js";

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
