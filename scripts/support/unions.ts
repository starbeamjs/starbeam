import { Globs, RegularFile, type Directory } from "./paths.js";
import { Union } from "./type-magic.js";

export class StarbeamType extends Union(
  "interfaces",
  "library",
  "support:tests",
  "support:build",
  "demo:react",
  "unknown",
  "draft",
  "root",
  "none"
) {
  /**
   * The default extensions that should be treated as inputs (for unused analysis and cleaning).
   */
  defaultInputExtensions(): string[] {
    if (this.is("interfaces")) {
      return ["d.ts"];
    } else {
      return ["ts", "tsx", "js", "jsx", "d.ts"];
    }
  }

  hasCategory(kind: "demo" | "support"): boolean {
    return this.value.startsWith(`${kind}:`);
  }
}

type Ext = "d.ts" | "js" | "jsx" | "ts" | "tsx";

const EXTS = ["d.ts", "js", "jsx", "ts", "tsx"] as const;

export class StarbeamSources extends Union(
  "js:untyped",
  "js:typed",
  "jsx:typed",
  "jsx:untyped",
  "ts",
  "tsx",
  "d.ts"
) {
  /**
   * Determine whether this source type includes the given extension.
   */
  has(ext: Ext): boolean {
    return this.extensions.includes(ext);
  }

  /**
   * The list of extensions that are included in this source type.
   */
  get extensions(): Ext[] {
    switch (this.value) {
      case "js:untyped":
        return ["js"];
      case "js:typed":
        return ["js", "d.ts"];
      case "jsx:untyped":
        return ["jsx", "js"];
      case "jsx:typed":
        return ["jsx", "js", "d.ts"];
      case "ts":
        return ["ts"];
      case "tsx":
        return ["tsx", "ts"];
      case "d.ts":
        return ["d.ts"];
    }
  }

  hasCategory(...kinds: ("js" | "jsx")[]): boolean {
    return kinds.some((kind) => this.value.startsWith(`${kind}:`));
  }

  #add(globs: Globs<RegularFile>, ext: Ext): Globs<RegularFile> {
    if (this.has(ext)) {
      globs = globs.add(`**/*.${ext}`);
    }
    return globs;
  }

  #output(globs: Globs<RegularFile>, ext: Ext): Globs<RegularFile> {
    if (!this.has(ext)) {
      globs = globs.add(`**/*.${ext}`);
    }
    return globs;
  }

  typescript(root: Directory): Globs<RegularFile> {
    return this.select(root, ["ts", "tsx", "d.ts"]);
  }

  javascript(root: Directory): Globs<RegularFile> {
    return this.select(root, ["js"]);
  }

  jsx(root: Directory): Globs<RegularFile> {
    return this.select(root, ["jsx"]);
  }

  select(root: Directory, exts: Ext[]): Globs<RegularFile> {
    let globs = Globs.root(root, { match: ["files"] });

    for (const ext of exts) {
      globs = this.#add(globs, ext);
    }

    return globs;
  }

  exclude(root: Directory, excluded: Ext[]): Globs<RegularFile> {
    const selected = new Set(EXTS);

    for (const ext of excluded) {
      selected.delete(ext);
    }

    return this.select(root, [...selected]);
  }

  /**
   * Inputs that can be parsed with a TypeScript parser.
   */
  inputs(root: Directory): Globs<RegularFile> {
    return this.exclude(root, []);
  }

  outputs(root: Directory): Globs<RegularFile> {
    let globs = Globs.root(root, { match: ["files"] });

    for (const ext of EXTS) {
      globs = this.#output(globs, ext);
    }

    return globs;
  }
}

export class TemplateName extends Union(
  "interfaces.package.json",
  "npmrc",
  "package.json",
  "rollup.config.mjs",
  "tsconfig.json"
) {
  read(root: Directory): string {
    return root.file(`scripts/templates/package/${this}.template`).readSync();
  }
}
