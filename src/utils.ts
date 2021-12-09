export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function exhaustive(_value: never, type?: string): never {
  if (type) {
    throw Error(`unexpected types left in ${type}`);
  } else {
    throw Error(`unexpected types left`);
  }
}

export function assert(
  condition: any,
  message = "assertion failure"
): asserts condition {
  if (!condition) {
    throw Error(message);
  }
}
