import { program } from "commander";

import { version } from "@starbeam-workspace/root/package.json";

import { dirname } from "dirfilename";
import { resolve } from "path";
import { BuildCommand } from "./build.js";
import { StarbeamCommands } from "./support/commands.js";
import { ListCommand } from "./list.js";
import { CleanCommand } from "./clean.js";
import { DemoCommand } from "./demo.js";
import { UnusedCommand } from "./unused.js";
import { TemplateCommand } from "./template.js";
import { TestCommand } from "./test.js";
import { CheckCommand } from "./check.js";
import { ReleaseCommand } from "./release.js";
import { LintCommand } from "./lint.js";

new StarbeamCommands(
  resolve(dirname(import.meta), ".."),
  program
    .name("pnpm dev")
    .description("CLI commands to run from package.json")
    .version(version)
    .showHelpAfterError()
    .showSuggestionAfterError()
    .exitOverride(() => {
      // we're calling this from an npm script, so the noisy exit 1 is not useful
      process.exit(0);
    })
)
  .add(ListCommand)
  .add(BuildCommand)
  .add(CleanCommand)
  .add(DemoCommand)
  .add(UnusedCommand)
  .add(TemplateCommand)
  .add(TestCommand)
  .add(CheckCommand)
  .add(ReleaseCommand)
  .add(LintCommand)
  .run();
