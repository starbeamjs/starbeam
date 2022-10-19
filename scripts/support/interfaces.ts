import type { Command } from "commander";

import type { StarbeamCommands } from "./commands.js";

export interface StarbeamCommandOptions {
  root: string;
}

export interface StarbeamCommandSetup {
  (commands: StarbeamCommands): Command;
}
