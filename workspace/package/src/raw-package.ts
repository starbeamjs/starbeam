import { isPresentArray } from "@starbeam/core-utils";
import type { JsonValue } from "@starbeam-workspace/json";

import { formatKey } from "./packages";

export class RawPackage {
  readonly #pkg: Record<string, JsonValue>;
  readonly #root: string;

  constructor(pkg: Record<string, JsonValue>, root: string) {
    this.#pkg = pkg;
    this.#root = root;
  }

  get<T>(key: string | string[], options?: { default: T } | undefined): T;
  get<T>(
    key: string | string[],
    options?: { default: T | undefined } | undefined
  ): T | undefined {
    const keys = this.#key(key);

    if (typeof key === "string" && key.includes(":")) {
      if (key in this.#pkg) {
        return this.#pkg[key] as T;
      }
    }

    return this.#get({ key: keys, soFar: [], options });
  }

  #key(key: string | string[]): string[] {
    if (Array.isArray(key)) {
      return key;
    } else {
      return key.split(":");
    }
  }

  #get<T>({
    object = this.#pkg,
    key,
    soFar,
    options,
  }: {
    object?: Record<string, JsonValue> | undefined;
    key: string[];
    soFar: string[];
    options?: { default: T } | undefined;
  }): T | undefined {
    if (isPresentArray(key)) {
      const shorthand = key.join(":");

      if (shorthand in object) {
        return object[shorthand] as T;
      }

      const [first, ...rest] = key;

      if (first in object) {
        if (isPresentArray(rest)) {
          const next = object[first];

          if (typeof next === "object" && next !== null) {
            return this.#get({
              object: next as Record<string, JsonValue>,
              key: rest,
              soFar: [...soFar, first],
              options,
            });
          } else if (options && "default" in options) {
            return options.default;
          }
        } else {
          return object[first] as T;
        }
      } else if (options && "default" in options) {
        return options.default;
      }

      throw Error(
        `invalid package.json: missing ${formatKey(
          soFar,
          first
        )} in package.json (at ${this.#root})`
      );
    } else {
      return undefined;
    }
  }
}
