import type { Workspace } from "../workspace.js";
import type { TemplateName } from "./update-package.js";

export class Templates {
  readonly #workspace: Workspace;

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
  }

  get(name: TemplateName): string {
    return this.#workspace.root
      .file(`scripts/templates/package/${name}.template`)
      .readSync();
  }
}
