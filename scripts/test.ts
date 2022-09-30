import { QueryCommand } from "./support/commands.js";
import type { Workspace } from "./support/workspace.js";
import type { Package } from "./support/packages.js";
import { comment, header } from "./support/log.js";
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
      if (pkg.type?.is("root")) {
        continue;
      }

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
