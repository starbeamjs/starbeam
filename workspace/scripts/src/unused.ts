import { stringify } from "@starbeam/core-utils";
import type { Package } from "@starbeam-workspace/package";
import { Fragment } from "@starbeam-workspace/reporter";
import { FATAL_EXIT_CODE, PresentArray } from "@starbeam-workspace/shared";

import { QueryCommand } from "./support/commands/query-command";
import { checkUnused } from "./support/unused.js";

export const UnusedCommand = QueryCommand(
  "unused",
  "check for unused dependencies",
).action(async ({ packages, failFast, workspace }) => {
  const failures: Package[] = [];

  for (const pkg of packages) {
    const result = await workspace.reporter
      .group(
        stringify`${pkg.name} ${Fragment.comment(
          `(${workspace.relative(pkg.root)})`,
        )}`,
      )
      .finally((r) => {
        if (r.isStylish) {
          r.log("");
        }
      })
      .tryAsync(async () => checkUnused({ pkg }));

    if (result === "failure") {
      if (failFast) {
        return FATAL_EXIT_CODE;
      } else {
        failures.push(pkg);
      }
    }
  }

  PresentArray.from(failures).andThen({
    present: (failures) => {
      workspace.reporter.ul({
        header: Fragment.header(
          stringify`✗ ${Fragment.inverse(
            failures.length,
          )} packages with unused dependencies`,
        ),
        items: failures.map((pkg) => pkg.name),
        style: "problem",
      });
      return FATAL_EXIT_CODE;
    },
    empty: () => {
      workspace.reporter.log(Fragment.ok("✓ no unused dependencies"));
    },
  });
});
