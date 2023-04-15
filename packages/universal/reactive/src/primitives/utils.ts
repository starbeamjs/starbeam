import type {
  CoreFormulaTag,
  CoreTag,
  Description,
  TaggedReactive,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { RUNTIME } from "../runtime.js";

export interface PrimitiveOptions {
  description?: string | Description | undefined;
}

export type SugaryPrimitiveOptions =
  | PrimitiveOptions
  | string
  | Description
  | undefined;

export function isDescriptionOption(
  options: SugaryPrimitiveOptions
): options is string | Description | undefined {
  return (
    options === undefined || typeof options === "string" || "id" in options
  );
}

export function toOptions(options: SugaryPrimitiveOptions): PrimitiveOptions {
  if (isDescriptionOption(options)) {
    return { description: options };
  } else {
    return options;
  }
}

export interface FormulaFn<T> extends TaggedReactive<CoreFormulaTag, T> {
  (): T;
}

export function isFormulaFn<T>(value: unknown): value is FormulaFn<T> {
  return !!(
    typeof value === "function" &&
    TAG in value &&
    (value[TAG] as CoreTag).type === "formula"
  );
}

export function WrapFn<T>(
  formula: TaggedReactive<CoreFormulaTag, T>
): FormulaFn<T> {
  // If the formula is *already* a function, we just need a new identity for it,
  // so we'll wrap it in a simple proxy.
  //
  // To keep an eye on: we could also just create a new `FormulaFn` here, and if
  // it's faster and/or more ergonomic to do that, we should do that.
  if (typeof formula === "function") {
    return new Proxy(formula, {});
  }

  const fn = (): T => {
    return formula.read(RUNTIME.callerStack?.());
  };

  Object.defineProperties(fn, {
    current: {
      get: fn,
    },
    [TAG]: {
      get: () => formula[TAG],
    },
    read: {
      value: fn,
    },
  });

  return fn as FormulaFn<T>;
}

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
