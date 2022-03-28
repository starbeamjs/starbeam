import type { Styled } from "./fragment.js";

const ASSOCIATED_FORMATTERS = new WeakMap<object, CustomFormatter<unknown>>();

export function associateFormatter(
  target: object,
  formatter: CustomFormatter<unknown>
): void {
  ASSOCIATED_FORMATTERS.set(target, formatter);
}

const REGISTERED_FORMATTERS = new Set<CustomFormatter<unknown>>();

export function registerFormatter(formatter: CustomFormatter<unknown>) {
  REGISTERED_FORMATTERS.add(formatter);
}

export function getFormatter<T extends object>(
  target: T
): CustomFormatter<T> | null {
  let current = target;

  while (current) {
    const formatter = ASSOCIATED_FORMATTERS.get(current);

    if (formatter) {
      return formatter as CustomFormatter<T>;
    }

    current = Object.getPrototypeOf(current);
  }

  for (let formatter of REGISTERED_FORMATTERS) {
    if (formatter.match(target)) {
      return formatter as CustomFormatter<T>;
    }
  }

  return null;
}

export abstract class CustomFormatter<T> {
  abstract match(value: unknown): value is T;
  abstract format(value: T): Styled;
}
