import type {
  StarbeamInfo,
  StarbeamJsx,
  StarbeamTemplates,
  Used,
} from "./packages.js";
import type { StarbeamSources, StarbeamType } from "./unions.js";

export class Starbeam {
  #info: StarbeamInfo;

  constructor(info: StarbeamInfo) {
    this.#info = info;
  }

  get jsx(): StarbeamJsx {
    return this.#info.jsx;
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
