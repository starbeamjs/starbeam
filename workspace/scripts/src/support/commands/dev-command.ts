import type { CommandInfo } from "@starbeam-dev/schemas";
import type { ReporterOptions } from "@starbeam-workspace/reporter";
import { Workspace } from "@starbeam-workspace/workspace";

import { type CommandOptions, withOptions } from "./options";
import {
  type ActionArgs,
  type ActionResult,
  prepareCommand,
  StarbeamCommand,
} from "./shared.js";

/*
  eslint-disable 
  @typescript-eslint/explicit-module-boundary-types,
  @typescript-eslint/explicit-function-return-type --
  we really want TypeScript to infer the return type here.  
 */
export function DevCommand<const C extends CommandInfo = CommandInfo>(
  name: string,
  description: string,
  info?: C,
) {
  const prepared = prepareCommand({
    name,
    description,
    spec: info ?? {},
    prepare: [withOptions],
  });

  return {
    action: (
      action: (...args: ActionArgs<C, CommandOptions>) => ActionResult,
    ): StarbeamCommand => {
      return new StarbeamCommand({
        name,
        command: ({ root, scripted }) => {
          return prepared.action(async (positional, named) => {
            const workspace = Workspace.root(root, {
              ...named,
              scripted,
            } as ReporterOptions);

            const actionArgs = [
              ...positional,
              { ...named, workspace },
            ] as Parameters<typeof action>;

            return action(...actionArgs);
          });
        },
        defaults: info?.defaults,
      });
    },
  };
}
/*
  eslint-enable
  @typescript-eslint/explicit-module-boundary-types,
  @typescript-eslint/explicit-function-return-type
 */
