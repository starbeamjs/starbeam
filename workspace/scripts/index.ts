import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OK_EXIT_CODE } from "@starbeam-workspace/shared";
import { program } from "commander";

import { BuildCommand } from "./src/build.js";
import { CheckCommand } from "./src/check.js";
import { CiCommand } from "./src/ci.js";
import { CleanCommand } from "./src/clean.js";
import { DemoCommand } from "./src/demo.js";
import { FmtCommand } from "./src/fmt.js";
import { LintCommand } from "./src/lint.js";
import { ListCommand } from "./src/list.js";
import { ReleaseCommand } from "./src/release.js";
import { StarbeamCommands } from "./src/support/commands/commands";
import { TemplateCommand } from "./src/template.js";
import { TestCommand } from "./src/test.js";
import { UnusedCommand } from "./src/unused.js";
import { UpdateCommand } from "./src/update.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

await new StarbeamCommands(
  resolve(__dirname, "..", ".."),
  program
    .name("pnpm dev")
    .description("CLI commands to run from package.json")
    .showHelpAfterError()
    .showSuggestionAfterError()
    .exitOverride(() => {
      // we're calling this from an npm script, so the noisy exit 1 is not useful
      process.exit(OK_EXIT_CODE);
    }),
)
  .add(ListCommand)
  .add(BuildCommand)
  .add(CleanCommand)
  .add(DemoCommand)
  .add(UnusedCommand)
  .add(TemplateCommand)
  .add(TestCommand)
  .add(CiCommand)
  .add(CheckCommand)
  .add(ReleaseCommand)
  .add(LintCommand)
  .add(FmtCommand)
  .add(UpdateCommand)
  .run();
