import type { TsConfig } from "@starbeam-workspace/package";
import { StarbeamType } from "@starbeam-workspace/package";

import type { Migrator } from "../json-editor/migration.js";
import { UpdatePackageFn } from "./updates.js";

export const updateTsconfig = UpdatePackageFn(
  (updater, { workspace, root }) => {
    const { path, pkg } = updater;
    updater.json.migrate("tsconfig.json", (migrator: Migrator<TsConfig>) => {
      migrator.array("compilerOptions.types", (update) =>
        update.add(path(root.file("packages/env")).fromPackageRoot(), {
          matches: (type) => type.endsWith("/env"),
        })
      );

      if (updater.pkg.type.isType("demo")) {
        const devtool = path(
          root.file("packages/x/devtool/tsconfig.json")
        ).fromPackageRoot();

        const packages = path(
          root.file("packages/tsconfig.packages.json")
        ).fromPackageRoot();

        migrator
          .array("references", (update) =>
            update.add(...reference(devtool)).add(...reference(packages))
          )
          .array("include", (update) =>
            update
              .add("index.ts")
              .add("src/**/*")
              .add("vite.config.ts")
              .remove("vite.config.js")
          );
      }

      if (updater.pkg.type.isType("library") || updater.pkg.type.is("tests")) {
        migrator.set(
          "extends",
          path(
            root.file(".config/tsconfig/tsconfig.shared.json")
          ).fromPackageRoot(),
          "start"
        );
      } else if (pkg.type.isType("demo")) {
        migrator.set(
          "extends",
          path(
            root.file(`.config/tsconfig/tsconfig.${pkg.type.subtype}-demo.json`)
          ).fromPackageRoot(),
          "start"
        );

        if (pkg.type.is("demo:preact")) {
          migrator.addTo("compilerOptions.types", "preact");
        }
      } else if (pkg.type.is("root")) {
        // do nothing
      } else {
        workspace.reporter.fatal(
          `${String(pkg.root)} is an unknown type: ${String(
            pkg.type
          )}.\n\nIt should be one of:\n\n${StarbeamType.format()}`
        );
      }

      migrator
        .set("compilerOptions.composite", true)
        .set(
          "compilerOptions.outDir",
          path(root.dir(`dist/packages`)).fromPackageRoot()
        )
        .set("compilerOptions.declaration", true)
        .set(
          "compilerOptions.declarationDir",
          path(root.dir(`dist/types`)).fromPackageRoot()
        )
        .set("compilerOptions.declarationMap", true)
        .array("exclude", (a) => a.add("dist/**/*"));

      return migrator.write();
    });
  }
);

function reference<T extends string>(
  to: T
): [{ path: T }, { matches: (ref: { path: T }) => boolean }] {
  return [{ path: to }, { matches: ({ path }) => path === to }];
}
