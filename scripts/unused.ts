import { stringify } from "@starbeam/core-utils";

import { QueryCommand } from "./support/commands.js";
import { FATAL_EXIT_CODE } from "./support/constants.js";
import { Fragment } from "./support/log.js";
import type { Package } from "./support/packages.js";
import { PresentArray } from "./support/type-magic.js";
import { checkUnused } from "./support/unused.js";

export const UnusedCommand = QueryCommand("unused").action(
  async ({ packages, failFast, workspace }) => {
    const failures: Package[] = [];

    for (const pkg of packages) {
      const result = await workspace.reporter
        .group(
          stringify`${pkg.name} ${Fragment.comment(
            `(${workspace.relative(pkg.root)})`
          )}`
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
              failures.length
            )} packages with unused dependencies`
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
  }
);
