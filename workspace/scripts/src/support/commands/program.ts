import { findRoot } from "@starbeam-workspace/workspace";
import type { Command } from "commander";
import { program as CommanderProgram } from "commander";

import { defaultCommandSettings } from "./format-help.js";
import type { StarbeamCommand, ToCommanderOptions } from "./shared.js";

interface ScriptOptions {
  readonly args: string[];
  readonly root: string | ImportMeta;
  readonly scripted: boolean | undefined;
}

interface CreateOptions {
  root: string | ImportMeta;
  argv?: string[];
}

export class StarbeamProgram {
  static here(
    this: void,
    meta: ImportMeta,
    options?: { argv?: string[] },
  ): { create: (program: Command) => StarbeamProgram } {
    return StarbeamProgram.create({ root: meta, ...options });
  }

  static create(
    this: void,
    { root, argv = process.argv }: CreateOptions,
  ): {
    create: (program: Command) => StarbeamProgram;
  } {
    return {
      create: (program) => {
        return new StarbeamProgram({ root, ...parseScripted(argv) }, program);
      },
    };
  }

  readonly #options: ScriptOptions;
  readonly #commands: StarbeamCommand[] = [];
  #program: Command;

  private constructor(options: ScriptOptions, program: Command) {
    this.#options = options;
    this.#program = program;
  }

  add(...commands: StarbeamCommand[]): this {
    for (const command of commands) {
      this.#commands.push(command);
    }
    return this;
  }

  async #resolveOptions(): Promise<ToCommanderOptions> {
    const { root: providedRoot, scripted } = this.#options;

    const root =
      typeof providedRoot === "string"
        ? providedRoot
        : await findRoot(providedRoot);
    return {
      root,
      scripted,
    };
  }

  async run(): Promise<Command> {
    let program = this.#program;
    const options = await this.#resolveOptions();

    for (const command of this.#commands) {
      program = program.addCommand(command.toCommander(options));
    }

    return this.#program.parseAsync(this.#options.args);
  }
}

function parseScripted(args: string[]): {
  args: string[];
  scripted: boolean | undefined;
} {
  if (args.includes("--scripted")) {
    return { args: args.filter((a) => a !== "--scripted"), scripted: true };
  } else if (args.includes("--no-scripted")) {
    return { args: args.filter((a) => a !== "--no-scripted"), scripted: false };
  } else {
    return { args, scripted: undefined };
  }
}

export function Commands(
  options: { here: ImportMeta; name: string; description: string },
  commands: StarbeamCommand[],
): StarbeamProgram {
  return StarbeamProgram.here(options.here)
    .create(
      defaultCommandSettings(
        CommanderProgram.name(options.name).description(options.description),
      ),
    )
    .add(...commands);
}

export async function run(
  options: { here: ImportMeta; name: string; description: string },
  commands: StarbeamCommand[],
): Promise<void> {
  const program = Commands(options, commands);
  await program.run();
}
