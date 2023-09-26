import type { command } from "@starbeam-dev/schemas";

export type CommandValue = string | boolean | string[] | undefined;

export function StringOption<V extends string>(value: unknown): value is V {
  return typeof value === "string";
}
StringOption.required = <V extends string>(value: unknown): value is V =>
  StringOption(value);

StringOption.default = <V extends string>(
  value: V,
): command.TypeWithDefault<V> => [StringOption<V>, { default: value }];

StringOption.optional = <V extends string>(
  value: unknown,
): value is V | undefined => {
  return typeof value === "string" || value === undefined;
};

export function BooleanOption(value: unknown): value is boolean {
  return typeof value === "boolean";
}
BooleanOption.required = BooleanOption;
BooleanOption.default = (value: boolean): Value<boolean> => [
  BooleanOption,
  { default: value },
];
BooleanOption.optional = (value: unknown): value is boolean | undefined => {
  return typeof value === "boolean" || value === undefined;
};
type Type<T> = (input: unknown) => input is T;
export type Value<T extends CommandValue> = Type<T> | [Type<T>, { default: T }];
