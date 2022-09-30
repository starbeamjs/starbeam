import { Globs, RegularFile, type Directory } from "./paths.js";
import { Union } from "./type-magic.js";

const X = 1;

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
  has(ext: Ext): boolean {
    switch (ext) {
      case "d.ts":
        return this.is("d.ts", "js:typed", "jsx:typed");
      case "js":
        return this.value.startsWith("js");
      case "jsx":
        return this.value.startsWith("jsx");
      case "ts":
        return this.is("ts");
      case "tsx":
        return this.is("tsx");
    }
  }

  #add(globs: Globs<RegularFile>, ext: Ext): Globs<RegularFile> {
    if (this.has(ext)) {
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

function exhaustive(_x: never): never {
  throw new Error(`Unexpected value: ${_x}`);
}
