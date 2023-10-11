import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";

import { stringifyJSON } from "@starbeam/core-utils";
import type { JsonObject } from "trailway";

import type { PathData, WorkspacePath } from "../workspace.js";
import { Path } from "./abstract.js";
import type { Directory } from "./directory.js";

export interface AsRegularFile {
  expand: () => RegularFile;
}

export abstract class DiskFile extends Path {
  declare dir: (path: string, options?: { as: "root" }) => Directory;
  declare file: (path: string) => RegularFile;

  exists(): boolean {
    return existsSync(this.absolute);
  }
}

export class RegularFile extends DiskFile implements AsRegularFile {
  static build(workspace: WorkspacePath, data: PathData): RegularFile {
    return new RegularFile(workspace, data);
  }

  readonly [Symbol.toStringTag] = "RegularFile";

  create(data: PathData): RegularFile {
    return new RegularFile(this.workspace, data);
  }

  async rm(): Promise<void> {
    await unlink(this.absolute);
  }

  rmSync(): void {
    unlinkSync(this.absolute);
  }

  async read(): Promise<string>;
  async read<T extends JsonObject>(options: { as: "json" }): Promise<T>;
  async read({ as }: { as?: "json" } = {}): Promise<unknown> {
    return this.#as(await readFile(this.absolute, "utf8"), as);
  }

  readSync(): string;
  readSync<T extends JsonObject>(options: { as: "json" }): T;
  readSync({ as }: { as?: "json" } = {}): unknown {
    return this.#as(readFileSync(this.absolute, "utf8"), as);
  }

  async write(value: string): Promise<void>;
  async write(value: JsonObject, options: { as: "json" }): Promise<void>;
  async write(
    value: string | object,
    { as }: { as?: "json" } = {},
  ): Promise<void> {
    if (as === "json") {
      await writeFile(this.absolute, stringifyJSON(value));
    } else if (typeof value === "string") {
      await writeFile(this.absolute, value);
    } else {
      throw Error(
        `Cannot write an object to file without specifying { as: "json" }`,
      );
    }
  }

  writeSync(value: string): void;
  writeSync(value: JsonObject, options: { as: "json" }): void;
  writeSync(value: string | object, { as }: { as?: "json" } = {}): void {
    if (as) {
      writeFileSync(this.absolute, stringifyJSON(value));
    } else if (typeof value === "string") {
      writeFileSync(this.absolute, value);
    } else {
      throw Error(
        `Cannot write an object to file without specifying { as: "json" }`,
      );
    }
  }

  #as(raw: string, as: "json" | undefined): unknown {
    if (as === "json") {
      return JSON.parse(raw);
    } else {
      return raw;
    }
  }

  expand(): this {
    return this;
  }
}
