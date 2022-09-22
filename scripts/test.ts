import { execSync } from "child_process";
import sh from "shell-escape-tag";
import chalk from "chalk";
import { QueryCommand } from "./support/commands.js";

export const TestCommand = QueryCommand("test", {
  description: "run the tests for the selected packages",
}).action(({ packages, root }) => {
  for (const pkg of packages) {
    runTests(pkg.root, root);
  }
});

function runTests(inside: string, root: string) {
  const vitestExit = tryExec(sh`pnpm vitest --dir ${inside} --run`, {
    cwd: root,
  });

  const eslintExit = tryExec(sh`pnpm eslint`, { cwd: inside });
  const tscExit = tryExec(sh`tsc --noEmit`, { cwd: inside });

  report("vitest", vitestExit);
  report("eslint", eslintExit);
  report("tsc", tscExit);

  process.exit(vitestExit | eslintExit | tscExit);
}

function tryExec(cmd: string, { cwd }: { cwd: string }): number {
  try {
    console.info(chalk.magenta(`=== Running: ${cmd} ===`));
    console.info(chalk.gray(`> In: ${cwd}\n`));
    execSync(cmd, { stdio: "inherit", cwd });
  } catch (e) {
    return 1;
  }

  return 0;
}

function report(kind: string, exitCode: number) {
  if (exitCode === 0) {
    console.info(chalk.green(`> ${kind.padEnd(6)} : passed <`));
  } else {
    console.info(chalk.red(`> ${kind.padEnd(6)} : failed <`));
  }
}
