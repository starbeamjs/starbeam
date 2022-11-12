import type { StarbeamInfo, StarbeamTemplates, Used } from "./packages";
import type { StarbeamSources, StarbeamType } from "./unions.js";

export class Starbeam {
  #info: StarbeamInfo;

  constructor(info: StarbeamInfo) {
    this.#info = info;
  }

  get tsconfig(): string | undefined {
    return this.#info.tsconfig;
  }

  get type(): StarbeamType {
    return this.#info.type;
  }

  get used(): Used[] {
    return this.#info.used;
  }

  get templates(): StarbeamTemplates {
    return this.#info.templates;
  }

  get source(): StarbeamSources {
    return this.#info.source;
  }

  isInput(extension: "d.ts" | "js"): boolean {
    return this.#info.source.has(extension);
  }
}
