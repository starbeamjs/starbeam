import { firstNItems } from "@starbeam/core-utils";
import type { ReporterOptions } from "@starbeam-workspace/reporter";
import type { Command } from "commander";

import {
  type Arg,
  type CamelizedOptions,
  type CheckOption,
  type CommandOptions,
  type LongFlag,
  type ShortFlag,
  dasherize,
  normalize,
  normalizeFlag,
} from "./options";
import type { CommandValue, Value } from "./types";

export const INITIAL_ARGUMENTS = 0;

export abstract class BuildCommand<Args extends unknown[], Options, Short> {
  #command: Command;
  #arguments = INITIAL_ARGUMENTS;

  constructor(command: Command) {
    this.#command = command;
  }

  define(build: (command: Command) => Command): this {
    this.#command = build(this.#command);
    return this;
  }

  flag<A extends Arg>(
    name: CheckOption<A, Options, Short>,
    description: string,
    options: { default?: boolean } = {}
  ): BuildCommand<
    Args,
    Options & Record<LongFlag<A>, boolean>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  > {
    const defaultValue = options.default ?? false;
    const flags = normalizeFlag(name, defaultValue);

    this.#command = this.#command.option(flags, description, defaultValue);

    return this as BuildCommand<
      Args,
      Options & Record<LongFlag<A>, boolean>,
      Short & Record<ShortFlag<A>, boolean>
    >;
  }

  option<A extends Arg, V extends CommandValue>(
    name: CheckOption<A, Options, Short>,
    description: string,
    value: Value<V>
  ): BuildCommand<
    Args,
    Options & Record<LongFlag<A>, V>,
    Short & Record<ShortFlag<A>, LongFlag<A>>
  > {
    const flags = normalize(name);

    if (typeof value === "function") {
      this.#command = this.#command.option(flags, description);
    } else {
      const [, options] = value;

      this.#command = this.#command.option(flags, description, options.default);
    }

    return this as BuildCommand<
      Args,
      Options & Record<LongFlag<A>, V>,
      Short & Record<ShortFlag<A>, LongFlag<A>>
    >;
  }

  argument<V extends CommandValue>(
    name: string,
    description: string,
    value: Value<V>
  ): BuildCommand<Args, Options, Short> {
    const arg = dasherize(name);

    if (typeof value === "function") {
      this.#command = this.#command.argument(`<${arg}>`, description);
    } else {
      const [, options] = value;

      this.#command = this.#command.argument(
        `<${arg}>`,
        description,
        options.default
      );
    }

    this.#arguments++;
    return this;
  }

  protected get command(): Command {
    return this.#command;
  }

  protected extractOptions<ExtractArgs extends unknown[], ExtractOptions>(
    options: unknown[]
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
    ParseArgs extends unknown[],
    ParseOptions extends CommandOptions
  >(allArgs: unknown[], extra: Record<string, unknown>): unknown[] {
    const { args, options } = this.extractOptions<ParseArgs, ParseOptions>(
      allArgs
    );

    return [...args, { ...options, ...extra }];
  }

  protected get args(): number {
    return this.#arguments;
  }
}
