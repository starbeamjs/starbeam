import type { InspectOptionsStylized, Style as NodeStyleName } from "util";

import type { JSONValue } from "./json-value.js";

export enum StyleName {
  /**
   * Same as `special` in node, defaults to blue/cyan.
   *
   * Represents the name of a structure (i.e. the class name, function name,
   * etc.).
   */
  "id:name" = "special",
  /**
   * Same as `module` in node, defaults to white underlined.
   *
   * Represents the physical location of a value (i.e. a path).
   */
  "id:module" = "module",
  /**
   * Same as "number", "bigint", "boolean" in node, defaults to dark orange or
   * brown.
   *
   * Useful for representing an inner value of a structure when it's a simple
   * wrapper and the inner value is a number or boolean.
   */
  primitive = "number",
  /**
   * Same as "undefined" in node, defaults to gray.
   *
   * Represents annotations or descriptions.
   */
  dim = "undefined",
  /**
   * Same as "null" in node, defaults to white.
   */
  plain = "null",
  /**
   * Same as "string", "symbol" in node, defaults to green.
   *
   * Useful for representing an inner value of a structure when it's a simple
   * wrapper and the inner value is a string.
   */
  literal = "string",
  /**
   * Same as "regexp" in node, defaults to red.
   *
   * Represents values that are pattern-like. This includes regular expressions,
   * but can also include other patterns like file globs.
   */
  pattern = "regexp",
  /**
   * Same as "date" in node, defaults to magenta.
   *
   * Useful for representing an inner value of a structure when it's a built-in
   * JavaScript value like a date.
   */
  builtin = "date",
}

export interface DisplayStructOptions {
  /**
   * The description appears right after the label.
   *
   * For example, if you call `DisplayStruct("Stringy", { name: "hello" }, {
   * description: "short" }), the struct will display as:
   *
   * ```
   * Stringy[short] {
   *   name: "hello"
   * }
   * ```
   *
   * The brackets are automatically inserted for descriptions and cannot be
   * omitted.
   *
   * This differs from `annotation`, which appears after the structure and is
   * inserted as-is (without any additional decorations).
   */
  readonly description?: JSONValue | FormatFn;

  /**
   * The annotation appears after the structure.
   *
   * For example, if you call `DisplayStruct("Stringy", { name: "hello" }, {
   * annotation: "short" }), the struct will display as:
   *
   * ```
   * Stringy {
   *   name: "hello"
   * } short
   * ```
   *
   * Annotations appear inside the `()` for `DisplayNewtype`.
   *
   * For example, if you call `DisplayStruct("Stringy", "hello", {
   * annotation: "short" })`, the struct will display as:
   *
   * ```
   * Stringy("hello" short)
   * ```
   */
  readonly annotation?: string | FormatFn | { [key in string]: string };
}

export type Fields = Record<PropertyKey, unknown>;

export function DisplayStruct(
  name: string,
  fields: object,
  options?: DisplayStructOptions,
): object {
  const constructor = class {
    constructor() {
      for (const [key, value] of entries(fields)) {
        Object.defineProperty(this, key, {
          value,
          enumerable: true,
        });
      }
    }

    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, ...rest }: InspectOptionsStylized,
      inspect: typeof import("node:util").inspect,
    ): string {
      const displayName = computeDisplayName(stylize, name, options);

      return [
        formatDisplayName(displayName),
        inspect(fields, { ...rest }),
      ].join(" ");
    }
  };

  return new constructor();
}

type StylizeFn = (string: string, style: NodeStyleName) => string;

type FormatFn = (stylize: StylizeFn) => string;

function createStylizeFn(
  stylize: InspectOptionsStylized["stylize"],
): StylizeFn {
  return (text: string, style: NodeStyleName) => stylize(text, style);
}

export function Display(options: {
  name?: string;
  format: FormatFn;
  description?: string | FormatFn;
  annotation?: string | FormatFn | Record<string, string>;
}): object {
  return new (class {
    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, ...rest }: InspectOptionsStylized,
      inspect: typeof import("node:util").inspect,
    ): string {
      const displayName = options.name
        ? computeDisplayName(stylize, options.name, options)
        : undefined;

      const body = options.format(createStylizeFn(stylize));

      const annotation = options.annotation
        ? formatAnnotation(options.annotation, stylize)
        : [];

      if (displayName) {
        return [
          formatDisplayName(displayName),
          stylize("(", "undefined"),
          body,
          ...annotation,
          stylize(")", "undefined"),
        ].join("");
      } else {
        return inspect(body, { ...rest });
      }
    }
  })();
}

export function DisplayNewtype<S extends DisplayStructOptions>(
  name: string,
  inner: unknown,
  options?: S,
): object {
  const constructor = class {
    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, breakLength, ...rest }: InspectOptionsStylized,
      inspect: typeof import("node:util").inspect,
    ): string {
      const body = inspect(inner, { breakLength, ...rest });

      const displayName = computeDisplayName(stylize, name, options);
      const breaks = breakLength
        ? body.length + displayName.length > breakLength
        : false;

      const inspected = [
        formatDisplayName(displayName),
        stylize("(", "undefined"),
      ];
      if (breaks) inspected.push("\n  ");
      inspected.push(body);
      if (options?.annotation) {
        inspected.push(...formatAnnotation(options.annotation, stylize));
      }
      if (breaks) inspected.push("\n");
      inspected.push(stylize(")", "undefined"));
      if (displayName.desc) inspected.push(displayName.desc);

      return inspected.join("");
    }
  };

  return new constructor();
}

function formatAnnotation(
  annotation: string | FormatFn | Record<string, string>,
  stylize: InspectOptionsStylized["stylize"],
): string[] {
  if (typeof annotation === "string") {
    return [" ", stylize(annotation, "undefined")];
  } else if (typeof annotation === "function") {
    return [" ", annotation(createStylizeFn(stylize))];
  } else {
    return entries(annotation).flatMap(([key, value]) => [
      " ",
      stylize(key, "undefined"),
      "=",
      value,
    ]);
  }
}

type Entry<R extends object> = R extends Record<PropertyKey, unknown>
  ? { [P in keyof R]: [P, R[P]] }[keyof R]
  : [PropertyKey, unknown];

function entries<R extends object>(object: R): Entry<R>[] {
  return Object.entries(object) as Entry<R>[];
}

interface DisplayName {
  label: string;
  desc: string;
  length: number;
}

function computeDisplayName(
  stylize: InspectOptionsStylized["stylize"],
  name: string,
  options: DisplayStructOptions | undefined,
): DisplayName {
  const desc = options?.description;
  const displayName = stylize(name, "special");

  let computedDesc: string = "";

  if (typeof desc === "function") {
    computedDesc = desc(createStylizeFn(stylize));
  } else if (typeof desc === "string") {
    computedDesc = stylize(`[${formatDescription(desc)}]`, "undefined");
  }

  return {
    label: displayName,
    desc: computedDesc,
    length: displayName.length + computedDesc.length,
  };
}

function formatDescription(description: unknown) {
  return typeof description === "string"
    ? description
    : JSON.stringify(description);
}

function formatDisplayName({ label, desc }: DisplayName) {
  return `${label}${desc}`;
}
