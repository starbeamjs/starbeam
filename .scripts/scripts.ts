/// <reference path="../@types/shell-escape-tag/index.d.ts" />

import { program } from "commander";

import { version } from "../package.json" assert { type: "json" };

import { dirname } from "dirfilename";
import { resolve } from "path";
import { DemoCommand } from "./demo.js";
import { TemplateCommand } from "./template.js";
import { TestCommand } from "./test.js";
import { ListCommand } from "./list.js";

const root = resolve(dirname(import.meta), "..");

program
  .name("pnpm dev")
  .description("CLI commands to run from package.json")
  .version(version)
  .showHelpAfterError()
  .showSuggestionAfterError()
  .exitOverride(() => {
    // we're calling this from an npm script, so the noisy exit 1 is not useful
    process.exit(0);
  });

program.addCommand(DemoCommand({ root }));
program.addCommand(TemplateCommand({ root }));
program.addCommand(TestCommand({ root }));
program.addCommand(ListCommand({ root }));

program.parse();
