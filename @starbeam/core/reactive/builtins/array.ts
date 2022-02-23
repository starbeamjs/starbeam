/* eslint-disable @typescript-eslint/no-explicit-any */
// Unfortunately, TypeScript's ability to do inference *or* type-checking in a
// `Proxy`'s body is very limited, so we have to use a number of casts `as any`
// to make the internal accesses work. The type safety of these is guaranteed at
// the *call site* instead of within the body: you cannot do `Array.blah` in TS,
// and it will blow up in JS in exactly the same way, so it is safe to assume
// that properties within the getter have the correct type in TS.

import type { InferReturn } from "../../../trace-internals/src/wrapper.js";
import {
  type TrackedStorage,
  createStorage,
  getValue,
  setValue,
} from "./tracked-shim.js";

const ARRAY_GETTER_METHODS = new Set<string | symbol | number>([
  Symbol.iterator,
  "concat",
  "entries",
  "every",
  "fill",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "includes",
  "indexOf",
  "join",
  "keys",
  "lastIndexOf",
  "map",
  "reduce",
  "reduceRight",
  "slice",
  "some",
  "values",
]);

function convertToInt(prop: number | string | symbol): number | null {
  if (typeof prop === "symbol") return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

export class TrackedArray<T = unknown> {
  /**
   * Creates an array from an iterable object.
   * @param iterable An iterable object to convert to an array.
   */
  static from<T>(iterable: Iterable<T> | ArrayLike<T>): TrackedArray<T>;

  /**
   * Creates an array from an iterable object.
   * @param iterable An iterable object to convert to an array.
   * @param mapfn A mapping function to call on every element of the array.
   * @param thisArg Value of 'this' used to invoke the mapfn.
   */
  static from<T, U>(
    iterable: Iterable<T> | ArrayLike<T>,
    mapfn: (v: T, k: number) => U,
    thisArg?: unknown
  ): TrackedArray<U>;

  static from<T, U>(
    iterable: Iterable<T> | ArrayLike<T>,
    mapfn?: (v: T, k: number) => U,
    thisArg?: unknown
  ): TrackedArray<T> | TrackedArray<U> {
    return mapfn
      ? new TrackedArray(Array.from(iterable, mapfn, thisArg))
      : new TrackedArray(Array.from(iterable));
  }

  static of<T>(...arr: T[]): TrackedArray<T> {
    return new TrackedArray(arr);
  }

  constructor(arr: T[] = []) {
    let clone = arr.slice();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;

    let boundFns = new Map();

    return new Proxy(clone, {
      get(target, prop /*, _receiver */) {
        let index = convertToInt(prop);

        if (index !== null) {
          self.#readStorageFor(index);
          getValue(self.#collection);

          return target[index];
        } else if (prop === "length") {
          getValue(self.#collection);
        } else if (ARRAY_GETTER_METHODS.has(prop)) {
          let fn = boundFns.get(prop);

          if (fn === undefined) {
            fn = (...args: unknown[]) => {
              getValue(self.#collection);
              return (target as any)[prop](...args);
            };

            boundFns.set(prop, fn);
          }

          return fn;
        }

        return (target as any)[prop];
      },

      set(target, prop, value /*, _receiver */) {
        (target as any)[prop] = value;

        let index = convertToInt(prop);

        if (index !== null) {
          self.#dirtyStorageFor(index);
          setValue(self.#collection, null);
        } else if (prop === "length") {
          setValue(self.#collection, null);
        }

        return true;
      },

      getPrototypeOf() {
        return TrackedArray.prototype;
      },
    }) as InferReturn;
  }

  readonly #collection = createStorage(null, () => false);
  readonly #storages = new Map<number, TrackedStorage<null>>();

  #readStorageFor(index: number) {
    const storages = this.#storages;
    let storage = storages.get(index);

    if (storage === undefined) {
      storage = createStorage(null, () => false);
      storages.set(index, storage);
    }

    getValue(storage);
  }

  #dirtyStorageFor(index: number): void {
    const storage = this.#storages.get(index);

    if (storage) {
      setValue(storage, null);
    }
  }
}

export default TrackedArray;

// Ensure instanceof works correctly
Object.setPrototypeOf(TrackedArray.prototype, Array.prototype);
