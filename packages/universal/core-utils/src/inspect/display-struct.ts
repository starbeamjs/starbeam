import type {
  inspect as NodeInspectImport,
  InspectOptions,
  InspectOptionsStylized,
  Style as NodeStyleName,
} from "node:util";

import type { JSONValue } from "./json-value.js";

type NodeInspect = typeof NodeInspectImport;
type NodeStylizeFn = InspectOptionsStylized["stylize"];

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
   * Represents labels for values (i.e. `default=` in `default=1`)
   */
  label = "undefined",

  /**
   * Same as "undefined" in node, defaults to gray.
   *
   * Represents annotations that are intended to be represented in a more subtle
   * way that the value that the annotation is attached to.
   */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  annotation = "undefined",

  /**
   * Same as "undefined" in node, defaults to gray.
   *
   * Represents punctuation that should be represented in a subtle way to avoid
   * visual noise.
   */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  punctuation = "undefined",

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

  /**
   * Same as "date" in node, defaults to magenta.
   *
   * Represents TypeScript type names (as distinct from class or function names,
   * which are represented by `id:name` and represent JavaScript values).
   */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  type = "date",
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
  readonly annotation?:
    | string
    | FormatFn
    | { [key in string]: string }
    | undefined;
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
        if (value !== undefined) {
          Object.defineProperty(this, key, {
            value,
            enumerable: true,
          });
        }
      }
    }

    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, ...rest }: InspectOptionsStylized,
      inspect: NodeInspect,
    ): string {
      const displayName = computeDisplayName(
        stylize,
        name,
        options,
        inspect,
        rest,
      );

      return [
        formatDisplayName(displayName),
        inspect(fields, { ...rest }),
      ].join(" ");
    }
  };

  return new constructor();
}

type StylizeFn = (string: string, style: NodeStyleName) => string;

interface FormatFnOptions {
  stylize: StylizeFn;
  inspect: (value: unknown) => string;
  isNested: boolean;
}

type FormatFn = (options: FormatFnOptions) => string | string[];

let NESTED = false;

export function Display(options: {
  name?: NameOption;
  format: FormatFn;
  description?: string | FormatFn;
  annotation?: string | FormatFn | Record<string, string> | undefined;
}): object {
  return new (class {
    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, ...rest }: InspectOptionsStylized,
      inspect: NodeInspect,
    ): string {
      const prevNested = NESTED;

      try {
        const displayName = options.name
          ? computeDisplayName(stylize, options.name, options, inspect, rest)
          : undefined;

        NESTED = true;
        const body = callFormatFn(options.format, stylize, inspect, rest);

        const annotation = options.annotation
          ? formatAnnotation(options.annotation, stylize, inspect, rest)
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
          return body;
        }
      } finally {
        NESTED = prevNested;
      }
    }
  })();
}

export function DisplayNewtype(
  name: string,
  inner: unknown,
  options?: DisplayStructOptions,
): object {
  const constructor = class {
    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, breakLength, ...rest }: InspectOptionsStylized,
      inspect: NodeInspect,
    ): string {
      const body = inspect(inner, { breakLength, ...rest });

      const displayName = computeDisplayName(
        stylize,
        name,
        options,
        inspect,
        rest,
      );
      const breaks =
        displayName && breakLength
          ? body.length + displayName.length > breakLength
          : false;

      const inspected = [];
      if (displayName) {
        inspected.push(
          formatDisplayName(displayName),
          stylize("(", "undefined"),
        );
      }
      if (breaks) inspected.push("\n  ");
      inspected.push(body);
      if (options?.annotation) {
        inspected.push(
          ...formatAnnotation(options.annotation, stylize, inspect, rest),
        );
      }
      if (breaks) inspected.push("\n");
      inspected.push(stylize(")", "undefined"));
      if (displayName?.desc) inspected.push(displayName.desc);

      return inspected.join("");
    }
  };

  return new constructor();
}

function formatAnnotation(
  annotation: string | FormatFn | Record<string, string>,
  stylize: InspectOptionsStylized["stylize"],
  inspect: NodeInspect,
  options: InspectOptions,
): string[] {
  if (typeof annotation === "string") {
    return [" ", stylize(annotation, StyleName.annotation)];
  } else if (typeof annotation === "function") {
    return [" ", callFormatFn(annotation, stylize, inspect, options)];
  } else {
    return entries(annotation).flatMap(([key, value]) => [
      " ",
      stylize(key, StyleName.label),
      "=",
      value,
    ]);
  }
}

function callFormatFn(
  fn: FormatFn,
  stylize: NodeStylizeFn,
  inspect: NodeInspect,
  options: InspectOptions,
): string {
  const result = fn({
    inspect: (value) => inspect(value, options),
    stylize: (text, style) => stylize(text, style),
    isNested: NESTED,
  });

  return typeof result === "string" ? result : result.join("");
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

/**
 * When the name is compact, then it is only displayed in a nested context if it
 * has a description.
 *
 * Conceptually, a compact name is a name whose presence is not required in
 * order for the user to understand the body of the value's "display".
 *
 * For this reason, compact names can be left out in nested contexts to
 * streamline the output.
 *
 * Note that the presence of an annotation does not force a compact name to be
 * displayed.
 *
 * Consider this representation of `Type` with an annotation:
 *
 * ```
 * Type(StringOption default="hello")
 * ```
 *
 * And this representation of `Type` with a description:
 *
 * ```
 * Type[StringOption](default="hello")
 * ```
 *
 * In the case of an annotation, it is just fine to omit `Type` and end up with:
 *
 * ```
 * StringOption default="hello"
 * ```
 *
 * However, if you left out `Type` in the description situation, you'd end up with:
 *
 * ```
 * [StringOption](default="hello")
 * ```
 *
 * And this is not what you want.
 */
type NameOption = string | { compact: string };

/**
 * If the inspection is nested, then:
 * - If the name is compact and there is no description, return undefined.
 */
function computeDisplayName(
  stylize: InspectOptionsStylized["stylize"],
  name: NameOption,
  displayOptions: DisplayStructOptions | undefined,
  inspect: NodeInspect,
  inspectOptions: InspectOptions,
): DisplayName | undefined {
  const nameString = typeof name === "string" ? name : name.compact;
  const isCompact = typeof name !== "string";

  const desc = displayOptions?.description;
  const displayName = stylize(nameString, "special");

  let computedDesc: string = "";

  if (typeof desc === "function") {
    computedDesc = callFormatFn(desc, stylize, inspect, inspectOptions);
  } else if (typeof desc === "string") {
    computedDesc = stylize(`[${formatDescription(desc)}]`, "undefined");
  } else if (isCompact && NESTED) {
    return undefined;
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

function formatDisplayName(name: DisplayName | undefined): string[] {
  if (!name) return [];

  return [`${name.label}${name.desc}`];
}
