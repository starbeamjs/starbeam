export function isObject<T>(value: T): value is T & object {
  return typeof value === "object" && value !== null;
}
