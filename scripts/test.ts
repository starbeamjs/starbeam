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
  .action(async ({ packages, workspace }) => {
    workspace.reporter.verbose((r) =>
      r.section((r) => r.log(comment(`> cleaning root/dist`)))
    );

    shell.rm("-rf", workspace.root.dir("dist").absolute);

    const results = new AllResults();

    for (const pkg of packages) {
      const runner = new TestRunner(pkg, workspace);
      results.add(pkg, await runner.run());
    }

    process.exit(results.exitCode);
  });

class TestRunner {
  readonly #pkg: Package;
  readonly #workspace: Workspace;

  constructor(pkg: Package, workspace: Workspace) {
    this.#pkg = pkg;
    this.#workspace = workspace;
  }

  get #reporter() {
    return this.#workspace.reporter;
  }

  run(): Promise<PackageResults> {
    const tests = this.#pkg.tests;
    const results = new PackageResults();

    return this.#reporter
      .group(
        `\n${comment("testing")} ${header(this.#pkg.name)} ${comment(
          `(${this.#workspace.relative(this.#pkg.root)})`
        )}`
      )
      .catch(() => results)
      .try(async () => {
        for (const testName of Object.keys(tests)) {
          await this.#reporter.group(header.sub(testName), async () => {
            const result = await this.#workspace.exec(
              `pnpm run test:${testName}`,
              {
                cwd: this.#pkg.root.absolute,
              }
            );

            results.add(testName, result);
          });
        }

        return results;
      });
  }
}

export class AllResults {
  readonly #results: Map<Package, PackageResults> = new Map();

  add(pkg: Package, results: PackageResults): void {
    this.#results.set(pkg, results);
  }

  get ok(): boolean {
    return [...this.#results.values()].every((r) => r.ok);
  }

  get exitCode(): number {
    return this.ok ? 0 : 1;
  }
}

export class PackageResults {
  #results: Record<string, "ok" | "err"> = {};

  add(name: string, result: "ok" | "err"): void {
    this.#results[name] = result;
  }

  get ok(): boolean {
    return Object.values(this.#results).every((r) => r === "ok");
  }
}

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

  const tests = pkg.root.dir("tests");
  let vitestExit = 0;

  if (existsSync(tests)) {
    vitestExit = tryExec(sh`pnpm vitest --dir ${pkg.root} --run`, {
      cwd: workspace.root.absolute,
      workspace,
      pkg,
      failFast,
    });
  }

  const eslintExit = tryExec(sh`pnpm eslint`, {
    cwd: pkg.root.absolute,
    workspace,
    pkg,
    failFast,
  });
  const tscExit = tryExec(sh`tsc -b`, {
    cwd: pkg.root.absolute,
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
      `${header.sub(`Running: ${cmd}`)} ${comment(
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
