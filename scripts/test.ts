import { QueryCommand, StringOption } from "./support/commands.js";
import { CheckDefinition } from "./support/workspace.js";
import shell from "shelljs";
import { Fragment } from "./support/log.js";
import { FancyHeader } from "./support/reporter/fancy-header.js";
import { Package } from "./support/packages.js";

export const TestCommand = QueryCommand("test", {
  description: "run the tests for the selected packages",
})
  .flag(
    ["-O", "streamOutput"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .flag(["-f", "failFast"], "exit on first failure")
  .option("type", "the type of tests to run", StringOption.default("all"))
  .action(
    async ({ packages, workspace, streamOutput, workspaceOnly, type }) => {
      workspace.reporter.verbose((r) =>
        r.log(Fragment.comment(`> cleaning root/dist`))
      );

      shell.rm("-rf", workspace.root.dir("dist").absolute);

      if (workspaceOnly) {
        const rootPkg = Package.from(
          workspace,
          workspace.root.file("package.json")
        );

        const results = await workspace.check(
          ...tests(rootPkg, {
            streamOutput,
            select: (name) => name.startsWith("workspace:"),
            header: (name) => name.slice("workspace:".length),
            type,
          })
        );

        workspace.reporter.reportCheckResults(results, {
          success: "all tests succeeded",
          header: "test",
        });

        return;
      }

      const checks = new Map(
        packages
          .filter((pkg) => !pkg.type.is("root"))
          .filter((pkg) =>
            Object.keys(pkg.tests).some((test) => testMatches(test, type))
          )
          .map((pkg) => {
            return [
              pkg,
              tests(pkg, {
                streamOutput,
                select: () => true,
                header: (name) => name,
                type,
              }),
            ] as [Package, CheckDefinition[]];
          })
      );

      const results = await workspace.checks(checks, {
        label: (pkg) => pkg.name,
        header: (pkg) => FancyHeader.header(`testing ${pkg.name}`),
      });

      workspace.reporter.reportCheckResults(results, {
        success: "all tests succeeded",
      });
    }
  );

function tests(
  pkg: Package,
  options: {
    streamOutput: boolean;
    select: (test: string) => boolean;
    header: (test: string) => string;
    type: string;
  }
): CheckDefinition[] {
  return Object.keys(pkg.tests)
    .filter(options.select)
    .filter((name) => testMatches(name, options.type))
    .map((test) =>
      CheckDefinition(options.header(test), `pnpm run test:${test}`, {
        cwd: pkg.root,
        output: options.streamOutput ? "stream" : "when-error",
      })
    );
}

function testMatches(test: string, type: string) {
  if (type === "all") {
    return true;
  }
  return test === type || test.endsWith(`:${type}`);
}
