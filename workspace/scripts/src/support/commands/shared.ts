import { FIRST_OFFSET, firstNItems } from "@starbeam/core-utils";
import type { command, CommandInfo, FlagOption } from "@starbeam-dev/schemas";
import type { ReporterOptions } from "@starbeam-workspace/reporter";
import { Command as CommanderCommand } from "commander";

import {
  Arg,
  BooleanFlag,
  type CommandParameter,
  ValuedOption,
} from "./data.js";
import {
  type BasicOptions,
  type CamelizedFlag,
  type CamelizedOption,
} from "./options.js";

export type ActionArgs<C extends CommandInfo, Base> = [
  ...ArgValues<C>,
  CamelizedFlagOptions<C> & CamelizedTypedOptions<C> & Base,
];

type CamelizedFlagOptions<C extends CommandInfo> =
  C["flags"] extends NonNullable<CommandInfo["flags"]>
    ? CamelizedFlagOptionsField<C["flags"]>
    : object;

type CamelizedTypedOptions<C extends CommandInfo> =
  C["options"] extends NonNullable<CommandInfo["options"]>
    ? CamelizedTypedOptionsField<C["options"]>
    : object;

type CamelizedFlagOptionsField<O extends NonNullable<CommandInfo["flags"]>> = {
  [K in O[number][0] as CamelizedFlag<K>]: boolean;
};

type CamelizedTypedOptionsField<O extends NonNullable<CommandInfo["options"]>> =
  {
    [K in O[number][0] as CamelizedOption<K>]: O[number] extends readonly [
      infer _ extends K,
      string,
      infer S,
    ]
      ? S extends (value: unknown) => value is infer T
        ? T
        : S extends [string, (value: unknown) => value is infer T]
        ? T
        : never
      : never;
  };

export type ArgValues<C extends CommandInfo> = C["args"] extends infer A extends
  readonly unknown[]
  ? {
      [K in keyof A]: OptionTypeFor<A[K]>;
    }
  : [];

export type ActionFn<C extends CommandInfo, Base> = (
  ...args: ActionArgs<C, Base>
) => Promise<void | number> | void | number;

export interface BuildSimpleAction<Base> {
  action: (action: Base) => (options: { root: string }) => CommanderCommand;
}

export interface BuildActionWithInfo<C extends CommandInfo, Base> {
  action: (
    action: ActionFn<C, Base>,
  ) => (options: { root: string }) => CommanderCommand;
}

export type ActionResult = Promise<void | number> | void | number;

export interface BuildActions<C extends CommandInfo, Base> {
  action: (root: string) => (...args: ActionArgs<C, Base>) => ActionResult;
}

export type BuildAction = (options: { root: string }) => CommanderCommand;

export type FlagValues<C extends CommandInfo | undefined> =
  C extends CommandInfo
    ? {
        [K in keyof C["flags"] as FlagValue<K>]: boolean;
      } & {
        [K in keyof C["options"] as FlagValue<K>]: OptionTypeFor<
          C["options"][K]
        >;
      }
    : Record<string, never>;

export type OptionType<T> =
  | readonly [string, (input: unknown) => input is T]
  | readonly [string, T];

export type OptionTypeFor<V> = V extends readonly [
  string,
  (input: unknown) => input is infer S,
]
  ? S
  : V extends readonly [
      string,
      (
        input: unknown,
      ) => input is infer S | [(input: unknown) => input is infer S, infer _],
    ]
  ? S
  : V extends readonly [string, infer S]
  ? S
  : never;

type FlagValue<T> = T extends `--no-${infer F}`
  ? `--${F}`
  : T extends `--${infer F}`
  ? `--${F}`
  : never;

export type ShortFlagString = `-${string}`;
export type LongFlagString = `--${string}`;

export function extractShortFlag<C extends string>(
  desc: C,
): { flag?: ShortFlagString; description: string } {
  if (desc.startsWith("-") && desc.includes(":")) {
    const [flag, description] = desc.split(/\s*:\s*/) as [
      flag: ShortFlagString,
      description: string,
    ];

    return {
      flag,
      description,
    };
  } else {
    return {
      description: desc,
    };
  }
}

export type Create<Base> = <C extends CommandInfo>(
  basic: BasicOptions,
  info: C,
  root: string,
) => {
  action: (
    action: (...args: ActionArgs<C, Base>) => ActionResult,
  ) => CommanderCommand;
};

export interface FlagOptionSpec {
  kind: "flag";
  type: command.FlagOption;
  default: boolean;

  long: LongFlagString;
  short?: ShortFlagString | undefined;
  description: string;

  // @todo coercion function (which can also report errors)
}

export function normalizeFlag(
  long: `--${string}`,
  option: FlagOption,
): FlagOptionSpec {
  const defaultValue = long.startsWith("--no-");

  if (typeof option === "string") {
    const { flag: short, description } = extractShortFlag(option);
    return {
      kind: "flag",
      type: option,
      long,
      short,
      description,
      default: defaultValue,
    };
  } else {
    const { short, description } = option;
    return {
      kind: "flag",
      type: option,
      long,
      short,
      description,
      default: defaultValue,
    };
  }
}

export function createCommand(
  name: string,
  description: string,
  info: CommandInfo,
  prepare: PrepareCommandFn[],
): { command: CommanderCommand; namedPosition: number } {
  let command = new CommanderCommand(name).description(description);

  for (const fn of prepare) {
    command = fn(command);
  }

  command = applyParameters(command, info?.args?.map(Arg.of));
  command = applyParameters(command, info?.flags?.map(BooleanFlag.of));
  command = applyParameters(command, info?.options?.map(ValuedOption.of));

  return {
    command,
    namedPosition: info?.args?.length ?? FIRST_OFFSET,
  };
}

function applyParameters(
  command: CommanderCommand,
  parameters: CommandParameter[] = [],
) {
  for (const parameter of parameters) {
    command = parameter.applyTo(command);
  }

  return command;
}

export type PrepareCommandFn = (command: CommanderCommand) => CommanderCommand;

export class PreparedCommand {
  static prepare = ({
    name,
    description,
    spec,
    prepare = [],
  }: {
    name: string;
    description: string;
    spec: CommandInfo;
    prepare?: PrepareCommandFn[];
  }): PreparedCommand => {
    const { command, namedPosition } = createCommand(
      name,
      description,
      spec,
      prepare,
    );
    return new PreparedCommand(command, namedPosition);
  };

  #command: CommanderCommand;
  #namedPosition: number;

  private constructor(command: CommanderCommand, namedPosition: number) {
    this.#command = command;
    this.#namedPosition = namedPosition;
  }

  action = (
    action: (positional: readonly unknown[], named: object) => ActionResult,
  ): CommanderCommand => {
    return this.#command.action(async (...allArgs: unknown[]) => {
      const positional = firstNItems(allArgs, this.#namedPosition);
      const named = (allArgs.at(this.#namedPosition) ?? {}) as ReporterOptions;

      const result = await action(positional, named);

      if (typeof result === "number") process.exit(result);
    });
  };
}

export const prepareCommand: typeof PreparedCommand.prepare =
  PreparedCommand.prepare;
