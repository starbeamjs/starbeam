import { isPresentArray } from "@starbeam/core-utils";
import type { JsonValue } from "typed-json-utils";

import { formatKey } from "./packages";

export class RawPackage {
  readonly #pkg: Record<string, JsonValue>;
  readonly #root: string;

  constructor(pkg: Record<string, JsonValue>, root: string) {
    this.#pkg = pkg;
    this.#root = root;
  }

  getArray<T>(key: string | string[], options?: { default: T | T[] }): T[] {
    return this.get(key, { ...options, map: wrap });
  }

  get<T, U>(
    key: string | string[],
    options: { default?: T; map: (value: T) => U },
  ): U;
  get<T>(key: string | string[], options?: { default: T } | undefined): T;
  get<T, U>(
    key: string | string[],
    options?: { default?: T; map?: undefined | ((value: T) => U) } | undefined,
  ): T | U | undefined {
    function map(value: T): T | U {
      return options?.map ? options.map(value) : value;
    }

    const keys = this.#key(key);

    if (typeof key === "string" && key.includes(":")) {
      if (key in this.#pkg) {
        return map(this.#pkg[key] as T);
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

  #get<T, U = T>({
    object = this.#pkg,
    key,
    soFar,
    options,
  }: {
    object?: Record<string, JsonValue> | undefined;
    key: string[];
    soFar: string[];
    options?: { default?: T; map?: undefined | ((value: T) => U) } | undefined;
  }): T | U | undefined {
    function map(value: T): T | U {
      return options?.map ? options.map(value) : value;
    }

    if (isPresentArray(key)) {
      const shorthand = key.join(":");

      if (shorthand in object) {
        return map(object[shorthand] as T);
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
            return map(options.default);
          }
        } else {
          return map(object[first] as T);
        }
      } else if (options && "default" in options) {
        return map(options.default);
      }

      throw Error(
        `invalid package.json: missing ${formatKey(
          soFar,
          first,
        )} in package.json (at ${this.#root})`,
      );
    } else {
      return undefined;
    }
  }
}

function wrap<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
