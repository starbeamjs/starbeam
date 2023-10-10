import type { Command } from "commander";

import type { StarbeamProgram } from "./commands/program";

export interface StarbeamCommandOptions {
  root: string;
}

export type StarbeamCommandSetup = (commands: StarbeamProgram) => Command;
