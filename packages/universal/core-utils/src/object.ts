import { getFirst, isPresentArray, isSingleItemArray } from "./array.js";

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function objectHasKeys(object: object): boolean {
  return isPresentArray(Object.keys(object));
}

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type WithReadonly<T, K extends keyof T> = Expand<
  Exclude<T, K> & {
    readonly [P in K]: T[P];
  }
>;

/*
 eslint-disable @typescript-eslint/no-explicit-any -- These `any`s are necessary
 because they express the full generalization of the key, function and
 descriptor types. These `any`s avoid unchecked `any`s in other part of this
 file.
 */
type AnyKey = keyof any;
type AnyFunction = (...args: any[]) => any;
type AnyTypedDescriptorMap = Record<string, TypedPropertyDescriptor<any>>;
/* eslint-enable @typescript-eslint/no-explicit-any */

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

export function method<T, K extends keyof T>(fn: T[K] & AnyFunction): T;
export function method<T, K extends AnyKey, V extends AnyFunction>(
  fn: V,
): Define<T, { [P in K]: V }>;
export function method(fn: AnyFunction): TypedPropertyDescriptor<AnyFunction> {
  return {
    enumerable: false,
    configurable: true,
    writable: false,
    value: fn,
  };
}
export function defMethod<T, K extends keyof T>(
  object: T,
  key: K,
  fn: T[K] & AnyFunction,
): T;
export function defMethod<T, K extends AnyKey, V extends AnyFunction>(
  object: T,
  key: K,
  fn: V,
): Define<T, { [P in K]: V }>;
export function defMethod(
  object: object,
  key: AnyKey,
  fn: AnyFunction,
): object {
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
  fn: (object: T) => T[K],
): T;
export function getter<T, K extends AnyKey, V>(
  object: T,
  key: K,
  fn: (object: T) => V,
): Define<T, { readonly [P in K]: V }>;
export function getter(
  object: object,
  key: AnyKey,
  fn: (object: object) => unknown,
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

type DefinedObject<R extends Record<string, TypedPropertyDescriptor<unknown>>> =
  Expand<{
    [P in keyof R]: R[P] extends TypedPropertyDescriptor<infer V> ? V : unknown;
  }>;

export function defineObject<R extends AnyTypedDescriptorMap>(
  properties: R,
): DefinedObject<R> {
  return Object.defineProperties({}, properties) as DefinedObject<R>;
}

export function dataGetter<T>(getter: () => T): TypedPropertyDescriptor<T> {
  return {
    get: getter,
    enumerable: true,
  };
}

export function def<T, R extends AnyTypedDescriptorMap>(
  object: T,
  properties: R,
): T & DefinedObject<R> {
  return Object.defineProperties(object, properties) as T & DefinedObject<R>;
}

export function readonly<T, K extends keyof T>(
  object: T,
  key: K,
  ...args: [] | [T[K]] | [() => T[K]]
): WithReadonly<T, K>;
export function readonly<T, K extends AnyKey, V>(
  object: T,
  key: K,
  value: V,
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
