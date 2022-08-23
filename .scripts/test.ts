import { execSync } from "child_process";
import type { Command } from "commander";
import { program } from "commander";
import sh from "shell-escape-tag";
import type { StarbeamCommandOptions } from "./commands.js";
import { queryPackages } from "./support/packages.js";
import chalk from "chalk";

export function TestCommand({ root }: StarbeamCommandOptions): Command {
  return program
    .createCommand("test")
    .description("run all of the tests")
    .option("-p, --package <package-name>", "the package to test", "all")
    .option(
      "-s, --scope <package-scope>",
      "the scope of the package",
      "starbeam"
    )
    .action(({ package: packageName, scope }) => {
      const pkgs = queryPackages(root);
      const pkgName = normalizePackageName(packageName, scope);

      if (packageName !== "all") {
        const pkg = pkgs.find((p) => p.name === pkgName);

        if (pkg === undefined) {
          console.error(`package ${pkgName} not found`);
          process.exit(1);
        }

        runTests(pkg.root, root);
      } else {
        runTests(root, root);
      }

      // execSync(cmd, {
      //   stdio: "inherit",
      //   cwd: resolve(root, "demos", name),
      // });
    });
}

function normalizePackageName(name: string, scope: string): string {
  if (name === "all") {
    return "all";
  } else if (name.startsWith("@")) {
    return name;
  } else {
    return `@${scope}/${name}`;
  }
}

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
