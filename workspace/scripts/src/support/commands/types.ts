export type CommandValue = string | boolean | string[] | undefined;

export function StringOption<V extends string>(value: unknown): value is V {
  return typeof value === "string";
}
StringOption.required = StringOption;
StringOption.default = <V extends string>(value: V): Value<V> => [
  StringOption,
  { default: value },
];
StringOption.optional = (value: unknown): value is string | undefined => {
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
