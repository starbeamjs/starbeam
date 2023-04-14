import type { Command } from "commander";
import { program as CommanderProgram } from "commander";

import { BuildCommand } from "./build-command";
import type {
  Arg,
  BasicOptions,
  CamelizedOptions,
  CheckOption,
  CommandOptions,
  LongFlag,
  ShortCommandOptions,
  ShortFlag,
} from "./options";
import { applyBasicOptions } from "./options";
import { createWorkspace } from "./query-command.js";
import type { CommandValue, Value } from "./types";

export function DevCommand<T extends CommandOptions>(
  name: string,
  options?: BasicOptions
): BuildDevCommand<[], T, ShortCommandOptions> {
  const command = applyBasicOptions(
    CommanderProgram.createCommand(name),
    options
  );

  return new BuildDevCommand(command);
}

export class BuildDevCommand<
  Args extends unknown[],
  Options,
  Short
> extends BuildCommand<Args, Options, Short> {
  declare flag: <A extends Arg>(
    name: CheckOption<A, Options, Short>,
    description: string,
    options?: { default?: boolean }
  ) => BuildDevCommand<
    Args,
    Options & Record<LongFlag<A>, boolean>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  >;

  declare option: <A extends Arg, V extends CommandValue>(
    name: CheckOption<A, Options, Short>,
    description: string,
    value: Value<V>
  ) => BuildDevCommand<
    Args,
    Options & Record<LongFlag<A>, V>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  >;

  declare argument: <V extends CommandValue>(
    name: string,
    description: string,
    value: Value<V>
  ) => BuildDevCommand<[...Args, V], Options, Short>;

  action(
    action: (
      ...args: [...Args, CamelizedOptions<Options>]
    ) => void | Promise<void>
  ): (options: { root: string }) => Command {
    return ({ root }) =>
      this.command.action(async (...args) => {
        const { options } = this.extractOptions(args);
        return action(
          ...(this.parseOptions(args, {
            workspace: createWorkspace(root, options),
          }) as [...Args, CamelizedOptions<Options>])
        );
      });
  }
}
