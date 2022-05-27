import { strippableDescribe } from "@starbeam/debug/src/description.js";

export function describeValue(value: unknown): string {
  return strippableDescribe(value) || String(value);
}
