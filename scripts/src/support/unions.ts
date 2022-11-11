import { stringify } from "@starbeam/core-utils";

import type { JsonObject, JsonValue } from "./json.js";
import type { RegularFile } from "./paths.js";
import { type Directory, Globs } from "./paths.js";
import { type IntoUnionInstance, Union } from "./type-magic.js";

export class StarbeamType extends Union(
  "library:interfaces",
  "library:upstream-types",
  "library:public",
  "tests",
  "library:test-support",
  "library:build-support",
  "demo:react",
  "demo:preact",
  "unknown",
  "draft",
  "root",
  "none"
) {
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
    return this.inputExtensions.includes(ext);
  }

  get isJS(): boolean {
    return this.has("js");
  }

  get isTS(): boolean {
    return this.has("ts");
  }

  /**
   * The list of extensions that are included in this source type.
   */
  get inputExtensions(): Ext[] {
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

  outputs(root: Directory): Globs<RegularFile> {
    let globs = Globs.root(root, { match: ["files"] });

    for (const ext of EXTS) {
      globs = this.#output(globs, ext);
    }

    return globs;
  }
}

export class JsonTemplate extends Union(
  "interfaces.package.json",
  "package.json",
  "tsconfig.json"
) {
  read(root: Directory, filter?: JsonFilter): JsonObject | undefined {
    const json = root
      .file(`scripts/templates/package/${String(this)}.template`)
      .readSync({ as: "json" });

    if (filter) {
      return JsonEntries.create(json, this.value).filter(filter);
    } else {
      return json;
    }
  }
}

export type JsonFilterType = "source" | "type";
export type JsonFilter = Record<JsonFilterType, IntoUnionInstance>;

class JsonEntries {
  static create(object: JsonObject, path: string): JsonEntries {
    return new JsonEntries(path, Object.entries(object));
  }

  readonly #path: string;
  readonly #entries: [string, JsonValue][];

  private constructor(path: string, entries: [string, JsonValue][]) {
    this.#path = path;
    this.#entries = entries;
  }

  filter(filter: JsonFilter): JsonObject | undefined {
    const switchType = this.#switchType;

    if (switchType === undefined) {
      return Object.fromEntries(this.#entries);
    }

    const { type, choices } = switchType;

    if (type in filter) {
      const actual = String(filter[type]);

      if (actual in choices) {
        return choices[actual];
      }
    }

    if ("default" in choices) {
      return choices["default"];
    } else {
      throw Error(
        `No default in switch:${type} (for ${
          this.#path
        }) and the given filter (${JSON.stringify(filter)}) had no matches.`
      );
    }
  }

  get #switchType():
    | { type: JsonFilterType; choices: Record<string, JsonObject> }
    | undefined {
    const switchNode = this.#entries.find(
      ([key]) => key.startsWith("switch:") && key !== "switch:default"
    );

    if (!switchNode) {
      return;
    }

    const [key, choices] = switchNode;
    const [, switchType] = key.split(":") as ["switch", JsonFilterType];

    return {
      type: switchType,
      choices: choices as Record<string, JsonObject>,
    };
  }
}

export class Template extends Union(
  "interfaces.package.json",
  ".npmrc",
  "package.json",
  "rollup.config.mjs",
  "tsconfig.json",
  "vite.config.ts"
) {
  read(root: Directory): string {
    return root
      .file(stringify`scripts/templates/package/${this}.template`)
      .readSync();
  }
}
