export type LongFlag = `--${string}`;
export type RequiredLabel = `<${string}>`;
export type OptionalLabel = `[${string}]`;
export type Label = RequiredLabel | OptionalLabel;

export interface CommandInfo {
  /**
   * A command's notes are printed after the command's description and usage
   * information.
   */
  readonly notes?: string;

  /**
   * The positional arguments of the command.
   *
   * The default value is undefined (no positional arguments are passed to
   * the action).
   */

  readonly args?: readonly ArgSpec[] | undefined;

  /**
   * The options of the command. An option has an optional short name and a
   * specified type.
   *
   * The type is one of:
   *
   * - A string literal. The TypeScript type is inferred from the value. You can
   *   widen the type with `as T` (e.g. if you specify `"onclick" as EventName`,
   *   `"onclick"` will be the default value and the TypeScript type will be
   *   `EventName`).
   * - A string array literal. The TypeScript type is inferred from the value.
   *   You can widen the type with `as T[]` or `as [tuple, type]` (e.g. if you
   *   specify `["lint", "test"] as TestName[]`, `["lint", "test"]` will be
   *   the default value and the TypeScript type will be `TestName[]`).
   * - a TypeScript type predicate (`(input: unknown) => input is T`)
   * - a TypeScript type predicate with a default value (a tuple of the type
   *   predicate and `{ default: T }`)
   *
   * Options are not booleans by definition. If you want a boolean option, use
   * a flag, and if you want the flag to be on by default, use a flag whose name
   * starts with `--no-`.
   */
  readonly options?: readonly ValuedOptionSpec[] | undefined;

  /**
   * A flag is an option whose value is a boolean. Its default value is
   * `true` if the flag name starts with `--no-` and false otherwise.
   */
  readonly flags?: readonly FlagSpec[] | undefined;
}

export interface Command extends CommandInfo {
  /**
   * The name of the command
   */
  readonly name: string;

  /**
   * The description of the command
   */
  readonly description: string;
}

export type FlagOption = string | FlagInfo;

/**
 * An argument value is a value parsed from the command line as a positional
 * argument. The only supported value is a string.
 */
export type ArgumentValue = string;

/**
 * A rest argument value is a value parsed from the command line as the
 * rest of the positional arguments. The only supported value is an array of
 * strings.
 */
export type RestArgumentValue = ArgumentValue[];

/**
 * An option value is a value parsed from the command line when specified as
 * a named option. An option value can be a string or an array of strings.
 */
export type OptionValue = string | string[] | undefined;

export interface SimpleType<T extends OptionValue> {
  (input: unknown): input is T;
  readonly required: (value: unknown) => value is NonNullable<T>;
  readonly optional: (value: unknown) => value is T | undefined;
}

export type TypeWithDefault<T extends OptionValue> = [
  SimpleType<T>,
  { default: T },
];

/**
 * A dynamic type is one of:
 *
 * - A type predicate (`(input: unknown) => input is T`)
 * - A type predicate with a default value (a tuple of the type predicate and
 *   `{ default: T }`)
 */
export type DynamicType<T extends OptionValue> =
  | TypeWithDefault<T>
  | SimpleType<T>;

/**
 * An option type is one of:
 *
 * - A string literal. The TypeScript type is inferred from the value. You can
 *   widen the type with `as T` (e.g. if you specify `"onclick" as EventName`,
 *   `"onclick"` will be the default value and the TypeScript type will be
 *   `EventName`).
 * - A string array literal. The TypeScript type is inferred from the value.
 *   You can widen the type with `as T[]` or `as [tuple, type]` (e.g. if you
 *   specify `["lint", "test"] as TestName[]`, `["lint", "test"]` will be
 *   the default value and the TypeScript type will be `TestName[]`).
 * - a TypeScript type predicate (`(input: unknown) => input is T`)
 * - a TypeScript type predicate with a default value (a tuple of the type
 *   predicate and `{ default: T }`)
 */
export type OptionSpec<T extends OptionValue = OptionValue> = readonly [
  /*
    eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents --
    leave this redundant type for documentation    
  */
  description: `-${string}: ${string}` | string,
  type?: OptionType<T>,
];

export type FlagSpec = readonly [
  long: `--no-${string}` | `--${string}`,
  /*
    eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents --
    leave this redundant type for documentation    
  */
  description: `-${string}: ${string}` | string,
];

export type ArgSpec<T extends OptionValue = OptionValue> = readonly [
  description: `[${string}] ${string}` | `<${string}> ${string}`,
  type: OptionType<T>,
];

export type ArgDesc = ArgSpec[0];

export type ValuedOptionSpec = readonly [
  `${LongFlag} ${RequiredLabel}` | `${LongFlag} ${OptionalLabel}`,
  ...OptionSpec,
];

export type OptionType<T extends OptionValue = OptionValue> = DynamicType<T>;

export type OptionTypeFor<O extends OptionSpec> = O extends readonly [
  description: string,
  type: DynamicType<infer S>,
]
  ? S
  : O extends readonly [description: string, type: infer S]
  ? S
  : O extends [description: string, type: DynamicType<infer S>]
  ? S
  : O extends [description: string, type: infer S]
  ? S
  : never;

export interface FlagInfo {
  readonly short?: `-${string}`;
  readonly description: string;
  readonly default?: boolean;
}

export type ShortFlagInfo = [`-${string}`, FlagInfo];
