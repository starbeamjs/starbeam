import type { TsConfig } from "@starbeam-workspace/package";
import { StarbeamType } from "@starbeam-workspace/package";

import type { Migrator } from "../json-editor/migration.js";
import { UpdatePackageFn } from "./updates.js";

export const updateTsconfig = UpdatePackageFn(
  (updater, { workspace, paths }) => {
    const { path, pkg } = updater;
    updater.json.migrate("tsconfig.json", (migrator: Migrator<TsConfig>) => {
      migrator
        .remove("compilerOptions.emitDeclarationOnly")
        .array("compilerOptions.types", (update) =>
          update.add(path(paths.packages.file("env")).fromPackageRoot, {
            matches: (type) => type.endsWith("/env"),
          })
        );

      if (updater.pkg.type.isType("demo")) {
        const devtool = path(
          workspace.paths.packages.x.dir("devtool").file("tsconfig.json")
        ).fromPackageRoot;

        const packages = path(
          paths.packages.file("tsconfig.packages.json")
        ).fromPackageRoot;

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

      if (updater.pkg.tsconfig) {
        migrator.set(
          "extends",
          path(workspace.root.file(`.config/tsconfig/${updater.pkg.tsconfig}`))
            .fromPackageRoot,
          "start"
        );
        migrator.set(
          "extends",
          path(workspace.root.file(`.config/tsconfig/${updater.pkg.tsconfig}`))
            .fromPackageRoot,
          "start"
        );
      } else if (
        updater.pkg.type.isType("library") ||
        updater.pkg.type.is("tests")
      ) {
        migrator.set(
          "extends",
          path(workspace.root.file(".config/tsconfig/tsconfig.shared.json"))
            .fromPackageRoot,
          "start"
        );
      } else if (pkg.type.isType("demo")) {
        migrator.set(
          "extends",
          updater.path(
            workspace.root.file(
              `.config/tsconfig/tsconfig.${pkg.type.subtype}-demo.json`
            )
          ).fromPackageRoot,
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
          path(workspace.root.dir(`dist/packages`)).fromPackageRoot
        )
        .set("compilerOptions.declaration", true)
        .set(
          "compilerOptions.declarationDir",
          path(workspace.root.dir(`dist/types`)).fromPackageRoot
        )
        .set("compilerOptions.declarationMap", true)
        .addTo("exclude", "dist/**/*");

      return migrator.write();
    });
  }
);

function reference<T extends string>(
  to: T
): [{ path: T }, { matches: (ref: { path: T }) => boolean }] {
  return [{ path: to }, { matches: ({ path }) => path === to }];
}
