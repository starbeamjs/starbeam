import { checkUnused } from "./support/unused.js";
import { QueryCommand } from "./support/commands.js";
import type { Package } from "./support/packages.js";
import { Style } from "./support/log.js";
import { PresentArray } from "./support/type-magic.js";

export const UnusedCommand = QueryCommand("unused")
  .flag(["-f", "failFast"], "fail fast")
  .action(async ({ packages, failFast, workspace }) => {
    const failures: Package[] = [];

    for (const pkg of packages) {
      const result = await workspace.reporter
        .group(
          pkg.name +
            " " +
            Style({ comment: `(${workspace.relative(pkg.root)})` })
        )
        .finally((r) => {
          if (r.isStylish) {
            r.log("");
          }
        })
        .try(async () => {
          return await checkUnused({ pkg });
        });

      if (result === "failure") {
        if (failFast) {
          return 1;
        } else {
          failures.push(pkg);
        }
      }
    }

    PresentArray.from(failures).andThen({
      present: (failures) => {
        workspace.reporter.ul({
          header: Style({
            header: `✗ ${Style.inverted({
              "problem:header": failures.length,
            })} packages with unused dependencies`,
          }),
          items: failures.map((pkg) => pkg.name),
          style: "problem",
        });
        return 1;
      },
      empty: () => {
        workspace.reporter.log({ ok: "✓ no unused dependencies" });
      },
    });
  });
