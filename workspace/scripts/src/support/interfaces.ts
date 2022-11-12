import type { Command } from "commander";

import type { StarbeamCommands } from "./commands/commands";

export interface StarbeamCommandOptions {
  root: string;
}

export type StarbeamCommandSetup = (commands: StarbeamCommands) => Command;
