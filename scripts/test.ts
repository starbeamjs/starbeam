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
    ["-O", "--stream-output"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true }
  )
  .option("--type", "the type of tests to run", StringOption.optional)
  .flag(["-s", "--specs"], "run the specs")
  .flag("--watch", "run the quick tests")
  .action(
    async ({
      packages,
      workspace,
      streamOutput,
      workspaceOnly,
      type,
      specs,
      watch,
    }) => {
      workspace.reporter.verbose((r) =>
        r.log(Fragment.comment(`> cleaning root/dist`))
      );

      if (specs && type !== undefined && type !== "specs") {
        workspace.reporter.fatal(
          `You cannot specify both --specs and --type=${type}`
        );
      }

      if (watch && type !== undefined && type !== "specs") {
        workspace.reporter.fatal(
          `The --watch flag can only be used with the "specs" test type. You passed --type ${type}.`
        );
      }

      const testType = watch ? "specs" : specs ? "specs" : type ?? "all";

      shell.rm("-rf", workspace.root.dir("dist").absolute);

      if (workspaceOnly) {
        const rootPkg = Package.from(
          workspace,
          workspace.root.file("package.json")
        );

        if (watch) {
          await workspace.cmd(`pnpm run test:workspace:specs --watch`, {
            cwd: workspace.root.absolute,
            stdio: "inherit",
          });
          return;
        }

        const results = await workspace.check(
          ...tests(rootPkg, {
            streamOutput,
            watch,
            select: (name) => name.startsWith("workspace:"),
            header: (name) => name.slice("workspace:".length),
            type: testType,
          })
        );

        workspace.reporter.reportCheckResults(results, {
          success: "all tests succeeded",
          header: "test",
        });

        return;
      }

      const matches = packages
        .filter((pkg) => !pkg.type.is("root"))
        .filter((pkg) =>
          Object.keys(pkg.tests).some((test) => testMatches(test, testType))
        );

      if (watch) {
        if (matches.length > 1) {
          workspace.reporter.fatal(
            `The --watch flag can only be used when a single package is selected.\n\nFound ${
              matches.length
            } matching packages:\n\n${matches.map((m) => `- ${m}`).join("\n")}`
          );
        }

        await workspace.cmd(`pnpm run test:specs --watch`, {
          cwd: matches[0].root.absolute,
          stdio: "inherit",
        });

        return;
      }

      const checks = new Map(
        matches.map((pkg) => {
          return [
            pkg,
            tests(pkg, {
              streamOutput,
              watch,
              select: () => true,
              header: (name) => name,
              type: testType,
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
    watch: boolean;
    select: (test: string) => boolean;
    header: (test: string) => string;
    type: string;
  }
): CheckDefinition[] {
  return Object.keys(pkg.tests)
    .filter(options.select)
    .filter((name) => testMatches(name, options.type))
    .map((test) => {
      console.log({ test, type: options.type, stream: options.streamOutput });
      return CheckDefinition(
        options.header(test),
        `pnpm run test:${test}${options.watch ? "" : " --run"}`,
        {
          cwd: pkg.root,
          output: options.streamOutput ? "stream" : "when-error",
        }
      );
    });
}

function testMatches(test: string, type: string) {
  if (type === "all") {
    return true;
  }
  return test === type || test.endsWith(`:${type}`);
}
