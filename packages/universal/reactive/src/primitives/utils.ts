import type { Description } from "@starbeam/debug";
import type { ReactiveValue, TaggedReactive } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import type { FormulaTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";

export interface PrimitiveOptions {
  description?: DescriptionOption;
}

/**
 * If a string is passed as options to a primitive, it's the description.
 */
export type DescriptionOption = string | Description | undefined;

export type SugaryPrimitiveOptions = PrimitiveOptions | DescriptionOption;

export function isDescriptionOption(
  options: SugaryPrimitiveOptions
): options is DescriptionOption {
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

export interface FormulaFn<T> extends TaggedReactive<FormulaTag, T> {
  (): T;
}

export function WrapFn<T>(formula: ReactiveValue<T, FormulaTag>): FormulaFn<T> {
  const fn = (): T => {
    return formula.read(RUNTIME.callerStack());
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
