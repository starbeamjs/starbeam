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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKey = keyof any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

type DefineReadonly<T, K extends AnyKey, V> = Expand<
  Exclude<T, K> & {
    readonly [P in K]: V;
  }
>;

type Define<T, R> = Expand<
  Exclude<T, keyof R> & {
    readonly [P in keyof R]: R[P];
  }
>;

export function method<T, K extends keyof T>(
  object: T,
  key: K,
  fn: T[K] & AnyFunction
): T;
export function method<T, K extends AnyKey, V extends AnyFunction>(
  object: T,
  key: K,
  fn: V
): Define<T, { [P in K]: V }>;
export function method(object: object, key: AnyKey, fn: AnyFunction): object {
  Object.defineProperty(object, key, {
    enumerable: false,
    configurable: true,
    writable: false,
    value: fn,
  });

  return object;
}

export function getter<T, K extends keyof T>(
  object: T,
  key: K,
  fn: (object: T) => T[K]
): T;
export function getter<T, K extends AnyKey, V>(
  object: T,
  key: K,
  fn: (object: T) => V
): Define<T, { readonly [P in K]: V }>;
export function getter(
  object: object,
  key: AnyKey,
  fn: (object: object) => unknown
): object {
  Object.defineProperty(object, key, {
    enumerable: false,
    configurable: true,
    get: function (this: object) {
      return fn(this);
    },
  });

  return object;
}

export function readonly<T, K extends keyof T>(
  object: T,
  key: K,
  ...args: [] | [T[K]]
): WithReadonly<T, K>;
export function readonly<T, K extends AnyKey, V>(
  object: T,
  key: K,
  value: V
): DefineReadonly<T, K, V>;
export function readonly(
  object: object,
  key: AnyKey,
  ...args: [] | [unknown]
): object {
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

  return object;
}
