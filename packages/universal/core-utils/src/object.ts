import { isPresentArray } from "./array.js";

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function objectHasKeys(object: object): boolean {
  return isPresentArray(Object.keys(object));
}
