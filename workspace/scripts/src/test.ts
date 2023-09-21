import {
  isEmptyArray,
  isSingleItemArray,
  stringify,
} from "@starbeam/core-utils";
import { Package, type Test, TestName } from "@starbeam-workspace/package";
import { FancyHeader, Fragment } from "@starbeam-workspace/reporter";
import { fatal } from "@starbeam-workspace/shared";
import { CheckDefinition } from "@starbeam-workspace/workspace";
import shell from "shelljs";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types";

export const TestCommand = QueryCommand("test", {
  description: "run the tests for the selected packages",
})
  .flag(
    ["-O", "--stream-output"],
    "do not stream the lint output (but display it when the command fails)",
    { default: true },
  )
  .option("--type", "the type of tests to run", StringOption.optional)
  .flag(["-l", "--lint"], "run the lints (equivalent to --type lint)")
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
      lint,
      watch,
    }) => {
      workspace.reporter.verbose((r) => {
        r.log(Fragment.comment(`> cleaning root/dist`));
      });

      if (specs && type !== undefined && type !== "specs") {
        workspace.reporter.fatal(
          `You cannot specify both --specs and --type=${type}`,
        );
      }

      if (watch && type !== undefined && type !== "specs") {
        workspace.reporter.fatal(
          `The --watch flag can only be used with the "specs" test type. You passed --type ${type}.`,
        );
      }

      if (lint && type !== undefined && type !== "lint") {
        workspace.reporter.fatal(
          `The --lint flag can only be used with the "lint" test type. You passed --type ${type}.`,
        );
      }

      const testType: TestName = watch
        ? TestName.parse("specs")
        : specs
        ? TestName.from("specs")
        : lint
        ? TestName.from("lint")
        : type
        ? TestName.parse(type)
        : TestName.from("all");

      shell.rm("-rf", workspace.root.dir("dist").absolute);

      if (workspaceOnly) {
        const rootPkg = Package.from(
          workspace,
          workspace.root.file("package.json"),
        );

        if (watch) {
          workspace.cmd(`pnpm run test:workspace:specs --watch`, {
            cwd: workspace.root.absolute,
            stdio: "inherit",
          });
          return;
        }

        const results = await workspace.check(
          ...tests(rootPkg, {
            streamOutput,
            watch,
            header: (test) => String(test.name),
            type: testType,
            subtype: "workspace",
          }),
        );

        workspace.reporter.reportCheckResults(results, {
          success: "all tests succeeded",
          header: "test",
        });

        return;
      }

      if (watch) {
        const matches = packages.filter(
          ({ type, tests: { watch } }) =>
            !type.is("root") && watch.matches(testType).hasTests(),
        );

        if (isSingleItemArray(matches)) {
          const [firstMatch] = matches;

          workspace.cmd(`pnpm run test:specs`, {
            cwd: firstMatch.root,
            stdio: "inherit",
          });
        } else {
          const found = isEmptyArray(matches)
            ? stringify` There were ${Fragment.problem.inverse(
                "no",
              )} matching packages.`
            : stringify`\n\nFound ${Fragment.problem.inverse(
                matches.length,
              )} matching packages: ${matches
                .map((pkg) => `- ${pkg.name}`)
                .join(", ")}`;

          fatal(
            workspace.reporter.fatal(
              `The --watch flag can only be used when a single package is selected.${found}\n`,
            ),
          );
        }

        return;
      }

      const matches = packages.flatMap((pkg) => {
        const {
          type,
          tests: { run },
        } = pkg;

        if (type.is("root")) {
          return [];
        }

        const matches = run.matches(testType);

        return matches.hasTests() ? ([[pkg, matches]] as const) : [];
      });

      const checks = new Map(
        matches.map(([pkg]) => {
          return [
            pkg,
            tests(pkg, {
              streamOutput,
              watch,
              header: (test) => String(test.name),
              type: testType,
            }),
          ] as [Package, CheckDefinition[]];
        }),
      );

      const results = await workspace.checks(checks, {
        label: (pkg) => pkg.name,
        header: (pkg) => FancyHeader.header(`testing ${pkg.name}`),
      });

      workspace.reporter.reportCheckResults(results, {
        success: "all tests succeeded",
      });

      if (!results.isOk) {
        workspace.reporter.fail();
      }
    },
  );

function tests(
  pkg: Package,
  options: {
    streamOutput: boolean;
    watch: boolean;
    header: (test: Test) => string;
    type: TestName | "all";
    subtype?: "workspace";
  },
): CheckDefinition[] {
  const tests = options.watch ? pkg.tests.watch : pkg.tests.run;

  return tests
    .filter((test) => {
      const matches = options.type === "all" || test.name.eq(options.type);
      if (options.subtype === undefined) {
        return matches;
      } else {
        return matches && test.hasSubtype(options.subtype);
      }
    })
    .map((test) => {
      return CheckDefinition(
        options.header(test),
        stringify`pnpm run test:${test.name}`,
        {
          cwd: pkg.root,
          output: options.streamOutput ? "stream" : "when-error",
        },
      );
    });
}
