import { firstNItems } from "@starbeam/core-utils";
import type { CommandInfo } from "@starbeam-dev/schemas";
import type { ReporterOptions } from "@starbeam-workspace/reporter";
import type { Command } from "commander";

import { type CamelizedOptions, type CommandOptions } from "./options";
import type { BuildAction } from "./shared.js";

export const INITIAL_ARGUMENTS = 0;

interface FlagName {
  long: string;
  short?: string | undefined;
}

export type BuildCommandBase<C extends BuildCommand<unknown>> =
  C extends BuildCommand<infer Base> ? Base : never;

export abstract class BuildCommand<Base>
  implements BuildAction<CommandInfo, Base>
{
  #command: Command;
  #arguments = INITIAL_ARGUMENTS;

  constructor(command: Command) {
    this.#command = command;
  }

  abstract action: BuildAction<CommandInfo, Base>["action"];

  define(build: (command: Command) => Command): this {
    this.#command = build(this.#command);
    return this;
  }

  raw(
    flags: FlagName,
    description: string,
    defaultValue: string | boolean | string[] | undefined,
  ): this {
    const { long, short } = flags;

    if (!long.startsWith("--")) {
      throw new Error(`BUG: Invalid flag name: ${long}`);
    }

    if (long.startsWith("---")) {
      throw new Error(`BUG: Invalid long flag name (extra dashes): ${long}`);
    }

    if (short !== undefined) {
      if (!short.startsWith("-")) {
        throw new Error(`BUG: Invalid short flag name: ${short}`);
      }

      if (short.startsWith("--")) {
        throw new Error(
          `BUG: Invalid short flag name (extra dashes): ${short}`,
        );
      }
    }

    const flagString = short ? `${short}, ${long}` : long;

    this.#command = this.#command.option(flagString, description, defaultValue);
    return this;
  }

  protected get command(): Command {
    return this.#command;
  }

  protected extractOptions<
    ExtractArgs extends readonly unknown[] | undefined,
    ExtractOptions,
  >(
    options: unknown[],
  ): {
    args: ExtractArgs;
    options: CamelizedOptions<ExtractOptions & ReporterOptions>;
  } {
    const args = firstNItems(options, this.args) as ExtractArgs;
    const opts = options[this.args] as CamelizedOptions<
      ExtractOptions & ReporterOptions
    >;

    return {
      args,
      options: opts,
    };
  }

  protected parseOptions<
    ParseArgs extends readonly unknown[],
    ParseOptions extends CommandOptions,
  >(allArgs: unknown[], extra: Record<string, unknown>): unknown[] {
    const { args, options } = this.extractOptions<ParseArgs, ParseOptions>(
      allArgs,
    );

    return [...args, { ...options, ...extra }];
  }

  protected get args(): number {
    return this.#arguments;
  }
}
