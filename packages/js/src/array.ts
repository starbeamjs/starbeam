/* eslint-disable @typescript-eslint/no-explicit-any */
// Unfortunately, TypeScript's ability to do inference *or* type-checking in a
// `Proxy`'s body is very limited, so we have to use a number of casts `as any`
// to make the internal accesses work. The type safety of these is guaranteed at
// the *call site* instead of within the body: you cannot do `Array.blah` in TS,
// and it will blow up in JS in exactly the same way, so it is safe to assume
// that properties within the getter have the correct type in TS.

import { Stack } from "@starbeam/debug";
import { Description } from "@starbeam/debug/src/description/debug.js";

import { Collection } from "./collection.js";

type GetterMethod<T, P extends keyof T> = T[P] extends (...args: any[]) => any
  ? P
  : never;

type ArrayMethodName = keyof {
  [P in keyof unknown[] as GetterMethod<unknown[], P>]: P;
};

type UnsafeIndex = any;

const ARRAY_GETTER_METHODS = new Set<ArrayMethodName>([
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

function isGetterMethod(prop: PropertyKey): prop is ArrayMethodName {
  return ARRAY_GETTER_METHODS.has(prop as ArrayMethodName);
}

function convertToInt(prop: PropertyKey): number | null {
  if (typeof prop === "symbol") return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

type Fn = (...args: any[]) => any;

class Shadow<T> {
  static create<T>(target: T[], collection: Collection<number>): Shadow<T> {
    return new Shadow(new Map(), target, collection);
  }

  readonly #fns: Map<PropertyKey, Fn>;
  readonly #target: T[];
  readonly #collection: Collection<number>;

  private constructor(
    fns: Map<string, Fn>,
    target: T[],
    collection: Collection<number>
  ) {
    this.#fns = fns;
    this.#target = target;
    this.#collection = collection;
  }

  #method(prop: PropertyKey): Fn | undefined {
    let fn = this.#fns.get(prop);

    if (!fn) {
      fn = (...args: unknown[]) => {
        this.#collection.iterateKeys();
        // eslint-disable-next-line
        return (this.#target as any)[prop](...args);
      };

      this.#fns.set(prop, fn);
    }

    return fn;
  }

  at(index: number) {
    this.#collection.get(
      index,
      index in this.#target ? "hit" : "miss",
      member(index)
    );
    this.#collection.iterateKeys();

    return this.#target[index];
  }

  updateAt(index: number, value: T) {
    const current = this.#target[index];

    if (Object.is(current, value)) {
      return;
    }

    this.#collection.splice();
    this.#collection.set(index, "key:changes", member(index));

    this.#target[index] = value;
  }

  get(prop: PropertyKey): unknown {
    if (isGetterMethod(prop)) {
      return this.method(prop);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (this.#target as UnsafeIndex)[prop];
    }
  }

  set(prop: PropertyKey, value: unknown): void {
    this.#collection.splice();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this.#target as UnsafeIndex)[prop] = value;
  }

  method(name: ArrayMethodName) {
    return this.#method(name);
  }

  updateLength(to: number) {
    // This happens when popping an empty array, for example.
    if (this.#target.length === to) {
      return;
    } else {
      this.#collection.splice();
    }
  }
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
    Object.freeze(arr);

    const target = [...arr];

    // eslint-disable-next-line
    const proxy: T[] = new Proxy(target, {
      get(target, prop /*, _receiver */) {
        if (prop === "length") {
          collection.iterateKeys();
          return target.length;
        }

        const index = convertToInt(prop);

        if (index === null) {
          return shadow.get(prop);
        } else {
          return shadow.at(index);
        }
      },

      set(target, prop, value /*, _receiver */) {
        const index = convertToInt(prop);

        if (prop === "length") {
          shadow.updateLength(value as number);

          if (value === target.length) {
            return true;
          }
        }

        if (index === null) {
          shadow.set(prop, value);
        } else if (index in target) {
          shadow.updateAt(index, value as T);
        } else {
          shadow.set(prop, value);
        }

        return true;
      },

      getPrototypeOf() {
        return TrackedArray.prototype;
      },
    });

    const collection = Collection.create<number>(
      Description.create("array", Stack.empty()),
      proxy
    );

    const shadow = Shadow.create(target, collection);

    return proxy;
  }
}

export default TrackedArray;

// Ensure instanceof works correctly
Object.setPrototypeOf(TrackedArray.prototype, Array.prototype);

function member(prop: string | number | symbol) {
  if (typeof prop === "string") {
    return `.${prop}`;
  } else {
    return `[${String(prop)}]`;
  }
}
