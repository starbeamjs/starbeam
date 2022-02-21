import { strippableDescribe } from "./strippable/description.js";

export function describeValue(value: unknown): string {
  return strippableDescribe(value) || String(value);
}
