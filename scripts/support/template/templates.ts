import type { EveryUnionMember } from "../type-magic.js";
import type { Workspace } from "../workspace.js";

export type TemplateName =
  | "npmrc"
  | "interfaces.package.json"
  | "package.json"
  | "tsconfig.json"
  | "rollup.config.mjs";

const TEMPLATE_NAMES: EveryUnionMember<TemplateName> = [
  "npmrc",
  "interfaces.package.json",
  "package.json",
  "tsconfig.json",
  "rollup.config.mjs",
];

export const TemplateName = {
  is(value: unknown): value is TemplateName {
    return TEMPLATE_NAMES.includes(value as TemplateName);
  },

  assert(value: unknown): TemplateName {
    if (!TemplateName.is(value)) {
      throw Error(
        `Expected a TemplateName, got ${value}.\n\nValid values are: ${TEMPLATE_NAMES.join(
          ", "
        )}`
      );
    }

    return value;
  },
};

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
