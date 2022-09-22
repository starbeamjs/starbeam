import { execSync } from "child_process";
import sh from "shell-escape-tag";
import chalk from "chalk";
import { QueryCommand } from "./support/commands.js";
import type { Workspace } from "./support/workspace.js";
import { existsSync } from "fs";
import type { Package } from "./support/packages.js";
import { comment, header, log, problem } from "./support/log.js";
import shell from "shelljs";

export const TestCommand = QueryCommand("test", {
  description: "run the tests for the selected packages",
})
  .flag(["-f", "failFast"], "exit on first failure")
  .action(({ packages, workspace, failFast, verbose }) => {
    let exitCode = 0;

    if (verbose) {
      log(`> cleaning root/dist`, comment);
    }
    shell.rm("-rf", workspace.resolve("dist"));

    for (const pkg of packages) {
      exitCode |= runTests(pkg, workspace, { failFast });
    }

    process.exit(exitCode);
  });

function runTests(
  pkg: Package,
  workspace: Workspace,
  { failFast }: { failFast: boolean }
): number {
  log(
    `\n${comment("testing")} ${header(pkg.name)} ${comment(
      `(${workspace.relative(pkg.root)})`
    )}\n`
  );

  const tests = pkg.resolve("tests");
  let vitestExit = 0;

  if (existsSync(tests)) {
    vitestExit = tryExec(sh`pnpm vitest --dir ${pkg.root} --run`, {
      cwd: workspace.root,
      workspace,
      pkg,
      failFast,
    });
  }

  const eslintExit = tryExec(sh`pnpm eslint`, {
    cwd: pkg.root,
    workspace,
    pkg,
    failFast,
  });
  const tscExit = tryExec(sh`tsc -b`, {
    cwd: pkg.root,
    workspace,
    pkg,
    failFast,
  });

  report("vitest", vitestExit, { failFast, pkg, workspace });
  report("eslint", eslintExit, { failFast, pkg, workspace });
  report("tsc", tscExit, { failFast, pkg, workspace });

  return vitestExit | eslintExit | tscExit;
}

function tryExec(
  cmd: string,
  {
    cwd,
    workspace,
  }: { cwd: string; pkg: Package; workspace: Workspace; failFast: boolean }
): number {
  try {
    log(
      `${header.dim(`Running: ${cmd}`)} ${comment(
        `In: ${workspace.relative(cwd) || `root (${cwd})`}`
      )}`
    );
    execSync(cmd, { stdio: "inherit", cwd });
  } catch (e) {
    return 1;
  }

  return 0;
}

function report(
  kind: string,
  exitCode: number,
  {
    failFast,
    pkg,
    workspace,
  }: { failFast: boolean; pkg: Package; workspace: Workspace }
): void {
  if (exitCode === 0) {
    console.info(chalk.green(`> ${kind.padEnd(6)} : passed <`));
  } else {
    console.info(chalk.red(`> ${kind.padEnd(6)} : failed <`));

    if (failFast) {
      console.group(problem.header(`\n\nFAILED PACKAGE`));
      log(`> ${pkg.name}`, problem);
      log(`> at: ${workspace.relative(pkg.root)}`, comment);
      console.groupEnd();
      process.exit(exitCode);
    }
  }
}
