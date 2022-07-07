import type {
  CustomInspectFunction,
  InspectOptionsStylized,
  Style,
} from "util";
import { isDebug } from "../conditional.js";

import {
  type DisplayStructOptions,
  type Fields,
  DisplayStruct,
} from "./display-struct.js";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export const DEBUG = Symbol("STARBEAM_DEBUG");
export type DEBUG = typeof DEBUG;

export const DEBUG_NAME = Symbol("STARBEAM_DEBUG_NAME");
export type DEBUG_NAME = typeof DEBUG_NAME;

/**
 * The TS type for CustomInspectFunction is wrong. You're allowed to return an
 * object, which then gets inspected, but TS assumes you have to return a
 * string.
 */
type InspectFunction = (...args: Parameters<CustomInspectFunction>) => unknown;

export interface Inspect {
  [INSPECT]: InspectFunction;
}

class Debug {
  static create(name: string, options: InspectOptionsStylized): Debug {
    return new Debug(name, options);
  }

  readonly #name: string;
  readonly #options: InspectOptionsStylized;

  private constructor(name: string, options: InspectOptionsStylized) {
    this.#name = name;
    this.#options = options;
  }

  stylize(text: string, styleType: Style): string {
    return this.#options.stylize(text, styleType);
  }

  struct(fields: Fields, options?: DisplayStructOptions) {
    return DisplayStruct(this.#name, fields, options);
  }
}

interface DebugClass<I> {
  name: string;
  prototype: I & Partial<Inspect>;
}

export function inspector<I>(
  Class: DebugClass<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    I extends { [INSPECT]: any }
      ? `Do not pass a class to debug() that already implements nodejs.util.inspect.custom`
      : I
  >,
  name?: string
): {
  define: (inspector: (instance: I, debug: Debug) => unknown) => void;
} {
  if (isDebug()) {
    return {
      define: (inspector: (instance: I, debug: Debug) => unknown) => {
        Class.prototype[INSPECT] = function (
          this: I,
          _depth: number,
          options: InspectOptionsStylized
        ) {
          return inspector(this, Debug.create(name ?? Class.name, options));
        };
      },
    };
  } else {
    return {
      define: () => {},
    };
  }
}
