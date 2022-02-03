import { strippableDescribe } from "./strippable/description";

export function describeValue(value: unknown): string {
  return strippableDescribe(value) || String(value);
}
