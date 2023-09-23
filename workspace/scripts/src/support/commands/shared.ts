import type { CommandInfo, FlagOption } from "@starbeam-dev/schemas";
import type { Command as CommanderCommand } from "commander";

import type { BuildCommand, BuildCommandBase } from "./build-command.js";
import type { CamelizedOption } from "./options.js";

export type ActionArgs<C extends CommandInfo, Base> = [
  ...ArgValues<C>,
  CamelizedFlagOptions<C> & CamelizedTypedOptions<C> & Base,
];

type CamelizedFlagOptions<C extends CommandInfo> = {
  [K in keyof C["flags"] as CamelizedOption<K>]: boolean;
};

type CamelizedTypedOptions<C extends CommandInfo> = {
  [K in keyof C["options"] as CamelizedOption<K>]: OptionType<C["options"][K]>;
};

export type ArgValues<C extends CommandInfo> = C["args"] extends infer A extends
  readonly unknown[] | unknown[]
  ? {
      [K in keyof A]: OptionType<A[K]>;
    }
  : [];

export interface BuildAction<C extends CommandInfo, Base> {
  action: (
    action: (
      ...args: ActionArgs<C, Base>
    ) => Promise<void | number> | void | number,
  ) => (options: { root: string }) => CommanderCommand;
}

export type FlagValues<C extends CommandInfo | undefined> =
  C extends CommandInfo
    ? {
        [K in keyof C["flags"] as FlagValue<K>]: boolean;
      } & {
        [K in keyof C["options"] as FlagValue<K>]: OptionType<C["options"][K]>;
      }
    : Record<string, never>;

export type OptionType<V> = V extends readonly [
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
    const [flag, description] = desc.split(":") as [
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

export type Create<C extends BuildCommand<unknown>> = (
  name: string,
  options?: { description: string; notes?: string | undefined } | undefined,
) => C;

export interface CommandFn<C extends BuildCommand<unknown>> {
  (name: string, description: string): BuildAction<object, BuildCommandBase<C>>;
  <const T extends CommandInfo>(
    name: string,
    description: string,
    options: T,
  ): BuildAction<T, BuildCommandBase<C>>;
}

export const createCommand = <const C extends BuildCommand<unknown>>(
  create: Create<C>,
): CommandFn<C> => {
  return ((
    name: string,
    description: string,
    options?: CommandInfo | undefined,
  ) => {
    let command = create(name, {
      description,
      notes: options?.notes,
    });

    const flags = options?.flags;

    if (flags) {
      for (const [long, info] of entries(flags)) {
        const { short, description, defaultValue } = normalizeFlag(long, info);
        command = command.raw({ long, short }, description, defaultValue);
      }
    }

    return command;
  }) as unknown as CommandFn<C>;
};

function normalizeFlag(long: `--${string}`, option: FlagOption) {
  const defaultValue = long.startsWith("--no-") ? true : undefined;

  if (typeof option === "string") {
    const { flag: short, description } = extractShortFlag(option);
    return {
      short,
      description,
      defaultValue,
    };
  } else {
    const { short, description } = option;
    return {
      short,
      description,
      defaultValue,
    };
  }
}

type Entries<T extends object> = T extends Record<infer K, infer V>
  ? [K, V][]
  : [];

function entries<T extends object>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}
