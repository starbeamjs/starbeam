/* eslint-disable @typescript-eslint/no-explicit-any */
// Unfortunately, TypeScript's ability to do inference *or* type-checking in a
// `Proxy`'s body is very limited, so we have to use a number of casts `as any`
// to make the internal accesses work. The type safety of these is guaranteed at
// the *call site* instead of within the body: you cannot do `Array.blah` in TS,
// and it will blow up in JS in exactly the same way, so it is safe to assume
// that properties within the getter have the correct type in TS.

import type { Description } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/universal";

import { Collection } from "./collection.js";

type GetterMethod<T, P extends keyof T> = T[P] extends (...args: any[]) => any
  ? P
  : never;

type ArrayMethodName = keyof {
  [P in keyof unknown[] as GetterMethod<unknown[], P>]: P;
};

type UnsafeIndex = any;

const ARRAY_READONLY_METHODS = new Set<ArrayMethodName>([
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

const ARRAY_MUTATOR_METHODS = new Set<ArrayMethodName>([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

function isReadonlyMethod(prop: PropertyKey): prop is ArrayMethodName {
  return ARRAY_READONLY_METHODS.has(prop as ArrayMethodName);
}

function isMutatorMethod(prop: PropertyKey): prop is ArrayMethodName {
  return ARRAY_MUTATOR_METHODS.has(prop as ArrayMethodName);
}

const EMPTY_SIZE = 0;

function convertToInt(prop: PropertyKey): number | null {
  if (typeof prop === "symbol") return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return Number.isInteger(num) ? num : null;
}

type Fn = (...args: any[]) => any;

class Shadow<T> {
  readonly #collection: Collection<number>;
  readonly #fns: Map<PropertyKey, Fn>;
  readonly #target: T[];

  static create<T>(target: T[], collection: Collection<number>): Shadow<T> {
    return new Shadow(new Map(), target, collection);
  }

  private constructor(
    fns: Map<string, Fn>,
    target: T[],
    collection: Collection<number>,
  ) {
    this.#fns = fns;
    this.#target = target;
    this.#collection = collection;
  }

  at(index: number): T | undefined {
    this.#collection.get(
      index,
      index in this.#target ? "hit" : "miss",
      member(index),
    );
    this.#collection.iterateKeys();

    return this.#target[index];
  }

  #createGetterMethod(methodName: ArrayMethodName): Fn | undefined {
    let fn = this.#fns.get(methodName);

    if (!fn) {
      fn = (...args: unknown[]) => {
        DEBUG?.markEntryPoint({
          description: `Array${
            typeof methodName === "string"
              ? `.${methodName}`
              : `[${methodName.description ?? "{unknown symbol}"}]`
          }`,
        });
        this.#collection.iterateKeys();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return (this.#target as any)[methodName](...args);
      };

      this.#fns.set(methodName, fn);
    }

    return fn;
  }

  #createMutatorMethod(methodName: ArrayMethodName): Fn {
    let fn = this.#fns.get(methodName);

    if (!fn) {
      fn = (...args: unknown[]) => {
        DEBUG?.markEntryPoint({
          description: `Array${
            typeof methodName === "string"
              ? `.${methodName}`
              : `[${methodName.description ?? "{unknown symbol}"}]`
          }`,
        });
        const prev = this.#target.length;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const result = (this.#target as any)[methodName](...args);

        const next = this.#target.length;

        if (prev !== EMPTY_SIZE || next !== EMPTY_SIZE) {
          this.#collection.splice();
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
      };
    }

    return fn;
  }

  get(prop: PropertyKey): unknown {
    if (isReadonlyMethod(prop)) {
      return this.getterMethod(prop);
    } else if (isMutatorMethod(prop)) {
      return this.mutatorMethod(prop);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (this.#target as UnsafeIndex)[prop];
    }
  }

  getterMethod(name: ArrayMethodName): Fn | undefined {
    return this.#createGetterMethod(name);
  }

  set(prop: PropertyKey, value: unknown): void {
    this.#collection.splice();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this.#target as UnsafeIndex)[prop] = value;
  }

  mutatorMethod(name: ArrayMethodName): Fn {
    return this.#createMutatorMethod(name);
  }

  updateAt(index: number, value: T): boolean {
    const current = this.#target[index];

    if (Object.is(current, value)) {
      return false;
    }

    this.#collection.splice();
    this.#collection.set(index, "key:changes", member(index));

    this.#target[index] = value;
    return true;
  }

  updateLength(to: number): void {
    // This happens when popping an empty array, for example.
    if (this.#target.length === to) {
      return;
    } else {
      this.#collection.splice();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class TrackedArray<T = unknown> {
  constructor(description: Description | undefined, arr: T[] = []) {
    Object.freeze(arr);

    const target = [...arr];

    const proxy: T[] = new Proxy(target, {
      get(getterTarget, prop /*, _receiver */) {
        if (prop === "length") {
          DEBUG?.markEntryPoint(`Array.${prop}`);
          collection.iterateKeys();
          return getterTarget.length;
        }

        const index = convertToInt(prop);
        DEBUG?.markEntryPoint(["object:get", "TrackedArray", index ?? prop]);

        if (index === null) {
          return shadow.get(prop);
        } else {
          return shadow.at(index);
        }
      },

      set(setterTarget, prop, value /*, _receiver */) {
        const index = convertToInt(prop);

        DEBUG?.markEntryPoint(["object:set", `Array`, index ?? prop]);

        if (index !== null && index in setterTarget) {
          // mutating a numeric array property only invalidates the
          // corresponding index.
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

    const collection = Collection.create<number>(description, proxy);

    const shadow = Shadow.create(target, collection);

    return proxy;
  }
}

// Ensure instanceof works correctly
Object.setPrototypeOf(TrackedArray.prototype, Array.prototype);

function member(prop: string | number | symbol): string {
  if (typeof prop === "string") {
    return `.${prop}`;
  } else {
    return `[${String(prop)}]`;
  }
}
