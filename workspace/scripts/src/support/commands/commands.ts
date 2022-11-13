import type { Command } from "commander";

export class StarbeamCommands {
  readonly #root: string;
  #program: Command;

  constructor(root: string, program: Command) {
    this.#root = root;
    this.#program = program;
  }

  add(command: ({ root }: { root: string }) => Command): this {
    this.#program.addCommand(command({ root: this.#root }));
    return this;
  }

  async run(): Promise<Command> {
    return this.#program.parseAsync();
  }
}
