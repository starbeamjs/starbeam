import type { JsonValue } from "typed-json-utils";
import { expect } from "vitest";

type Predicate = (value: JsonValue | undefined) => boolean;

export const ARRAYS = [
  [],
  [1],
  [1, 2],
  [[], 1],
  [1, []],
  [{}, []],
  [{}, { a: 1 }],
  [{ a: 1 }, {}],
  [{ a: 1 }, { a: 2 }],
];

export function testArrays(predicate: Predicate, expected: boolean): void {
  for (const array of ARRAYS) {
    expect(
      predicate(array),
      `${predicate.name}(${JSON.stringify(array)})`,
    ).toBe(expected);
  }
}

export const OBJECTS = [
  {},
  { a: 1 },
  { a: 1, b: 2 },
  { a: {}, b: 2 },
  { a: 1, b: {} },
  { a: [], b: [] },
  { a: [], b: {} },
  { a: {}, b: [] },
  { a: {}, b: {} },
  { a: { a: 1 }, b: {} },
  { a: {}, b: { b: 2 } },
  { a: [], b: {} },
  { a: [1], b: {} },
  { a: { a: 1 }, b: [] },
  { a: { a: 1 }, b: { b: 2 } },
];

export function testObjects(predicate: Predicate, expected: boolean): void {
  for (const object of OBJECTS) {
    expect(
      predicate(object),
      `${predicate.name}(${JSON.stringify(object)})`,
    ).toBe(expected);
  }
}

export const ARRAY_LIKES = [
  { length: 0 },
  { length: 1, 0: 1 },
  { length: 1, 0: [] },
  { length: 1, 0: {} },
  { length: 2, 0: 1, 1: 2 },
  { length: 2, 0: 1, 1: [] },
  { length: 2, 0: 1, 1: {} },
  { length: 2, 0: [], 1: 2 },
  { length: 2, 0: {}, 1: 2 },
  { length: 2, 0: [], 1: [] },
];

export function testArrayLikes(predicate: Predicate, expected: boolean): void {
  for (const object of ARRAY_LIKES) {
    expect(
      predicate(object),
      `${predicate.name}(${JSON.stringify(object)})`,
    ).toBe(expected);
  }
}

export const STRINGS = ["", "a", "ab", "abc", "length", "0", "\u0000"];

export function testStrings(predicate: Predicate, expected: boolean): void {
  for (const string of STRINGS) {
    expect(
      predicate(string),
      `${predicate.name}(${JSON.stringify(string)})`,
    ).toBe(expected);
  }
}

export const NUMBERS = [
  0,
  0.5,
  10 / 3,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  Number.MAX_SAFE_INTEGER,
  Number.MAX_VALUE,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
  Number.NEGATIVE_INFINITY,
  Number.POSITIVE_INFINITY,
  NaN,
];

export function testNumbers(predicate: Predicate, expected: boolean): void {
  for (const number of NUMBERS) {
    expect(
      predicate(number),
      `${predicate.name}(${JSON.stringify(number)})`,
    ).toBe(expected);
  }
}

export const BOOLEANS = [true, false];

export function testBooleans(predicate: Predicate, expected: boolean): void {
  for (const value of BOOLEANS) {
    expect(
      predicate(value),
      `${predicate.name}(${JSON.stringify(value)})`,
    ).toBe(expected);
  }
}

export function testNull(predicate: Predicate, expected: boolean): void {
  expect(predicate(null), "null").toBe(expected);
}

export function testUndefined(predicate: Predicate): void {
  expect(predicate(undefined), "undefined is never a JSON value").toBe(false);
}
