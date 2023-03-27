import { getFirst } from "./array.js";
import { isSingleItemArray } from "./array.js";
import { isPresentArray } from "./array.js";

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function objectHasKeys(object: object): boolean {
  return isPresentArray(Object.keys(object));
}

  type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type WithReadonly<T, K extends keyof T> = Expand<
  Exclude<T, K> & {
    readonly [P in K]: T[P];
  }
>;

export function readonly<T, K extends keyof T>(
  object: T,
  key: K,
  ...args: [] | [T[K]]
): WithReadonly<T, K> {
  if (isSingleItemArray(args)) {
    Object.defineProperty(object, key, {
      enumerable: true,
      configurable: true,
      writable: false,
      value: getFirst(args),
    });
  } else {
    Object.defineProperty(object, key, {
      writable: false,
    });
  }

  return object as WithReadonly<T, K>;
}
