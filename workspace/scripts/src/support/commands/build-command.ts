import type { command } from "@starbeam-dev/schemas";

import type { LongFlagString, ShortFlagString } from "./shared.js";

export const INITIAL_ARGUMENTS = 0;

interface AbstractOptionSpec {
  long: LongFlagString;
  short?: ShortFlagString | undefined;
  description: string;

  // @todo coercion function (which can also report errors)
}

interface AbstractValuedOptionSpec<T extends command.OptionValue>
  extends AbstractOptionSpec {
  label: string;
  type: command.OptionType<T>;
}

export interface RequiredOptionSpec<T extends command.OptionValue>
  extends AbstractValuedOptionSpec<T> {
  kind: "required";
}

export interface OptionalOptionSpec<T extends command.OptionValue>
  extends AbstractValuedOptionSpec<T> {
  kind: "optional";
  default: T;
}

export interface FlagOptionSpec extends AbstractOptionSpec {
  kind: "flag";
  type: command.FlagOption;
  default: boolean;
}

type AnyValuedOptionSpec<T extends command.OptionValue> =
  | RequiredOptionSpec<T>
  | OptionalOptionSpec<T>;

export type AnyOptionSpec<T extends command.OptionValue> =
  | AnyValuedOptionSpec<T>
  | FlagOptionSpec;
