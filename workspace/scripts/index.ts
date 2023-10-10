import { BuildCommand } from "./src/build.js";
import { CheckCommand } from "./src/check.js";
import { CiCommand } from "./src/ci.js";
import { CleanCommand } from "./src/clean.js";
import { DemoCommand } from "./src/demo.js";
import { FmtCommand } from "./src/fmt.js";
import { LintCommand } from "./src/lint.js";
import { ListCommand } from "./src/list.js";
import { ReleaseCommand } from "./src/release.js";
import { run } from "./src/support/commands/program.js";
import { TemplateCommand } from "./src/template.js";
import { TestCommand } from "./src/test.js";
import { UnusedCommand } from "./src/unused.js";
import { UpdateCommand } from "./src/update.js";

await run(
  {
    here: import.meta,
    name: "pnpm dev",
    description: "CLI commands to run from package.json",
  },
  [
    ListCommand,
    BuildCommand,
    CleanCommand,
    DemoCommand,
    UnusedCommand,
    TemplateCommand,
    TestCommand,
    CiCommand,
    CheckCommand,
    ReleaseCommand,
    LintCommand,
    FmtCommand,
    UpdateCommand,
  ],
);
