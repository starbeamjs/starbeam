import type { CommandInfo } from "@starbeam-dev/schemas";
import type { Command as CommanderCommand } from "commander";
import { program as CommanderProgram } from "commander";

import { BuildCommand } from "./build-command";
import type { BasicOptions, CommandOptions } from "./options";
import { applyBasicOptions } from "./options";
import { createWorkspace } from "./query-command.js";
import { type ActionArgs, createCommand } from "./shared.js";

export function create(name: string, options?: BasicOptions): BuildDevCommand {
  const command = applyBasicOptions(
    CommanderProgram.createCommand(name),
    options,
  );

  return new BuildDevCommand(command);
}

export const DevCommand = createCommand(create);

export class BuildDevCommand extends BuildCommand<CommandOptions> {
  readonly action = <C extends CommandInfo>(
    action: (
      ...args: ActionArgs<C, CommandOptions>
    ) => Promise<void | number> | void | number,
  ): ((options: { root: string }) => CommanderCommand) => {
    return ({ root }) =>
      this.command.action(async (...args) => {
        const { options } = this.extractOptions(args);
        const actionArgs = this.parseOptions(args, {
          workspace: createWorkspace(root, options),
        });
        await action(...(actionArgs as ActionArgs<C, CommandOptions>));
      });
  };
}
