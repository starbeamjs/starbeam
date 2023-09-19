import type { TsConfig } from "@starbeam-workspace/package";
import { StarbeamType } from "@starbeam-workspace/package";

import type { Migrator } from "../json-editor/migration.js";
import { UpdatePackageFn } from "./updates.js";

export const updateTsconfig = UpdatePackageFn(
  async (updater, { workspace, root }) => {
    const { path, pkg } = updater;
    await updater.json.migrate(
      "tsconfig.json",
      async (migrator: Migrator<TsConfig>) => {
        migrator.array("compilerOptions.types", (update) =>
          update.add(path(root.file("packages/env")).fromPackageRoot(), {
            matches: (type) => type.endsWith("/env"),
          }),
        );

        if (!updater.pkg.starbeam.jsx.is("none")) {
          migrator.set("compilerOptions.jsx", "react-jsx");
          migrator.set(
            "compilerOptions.jsxImportSource",
            String(updater.pkg.starbeam.jsx),
          );
        }

        if (
          updater.pkg.type.isType("library") ||
          updater.pkg.type.is("tests")
        ) {
          migrator.set(
            "extends",
            path(
              root.file(".config/tsconfig/tsconfig.shared.json"),
            ).fromPackageRoot(),
            "start",
          );
        } else if (pkg.type.isType("demo")) {
          migrator.remove("references");
          migrator.set(
            "extends",
            path(
              root.file(".config/tsconfig/tsconfig.demo.json"),
            ).fromPackageRoot(),
          );
        } else if (pkg.type.is("root")) {
          // do nothing
        } else {
          workspace.reporter.fatal(
            `${String(pkg.root)} is an unknown type: ${String(
              pkg.type,
            )}.\n\nIt should be one of:\n\n${StarbeamType.format()}`,
          );
        }

        if (pkg.type.isType("demo")) {
          migrator.remove("compilerOptions.composite");
          migrator.remove("compilerOptions.declaration");
          migrator.remove("compilerOptions.declarationMap");
          migrator.remove("compilerOptions.declarationDir");
          migrator.remove("compilerOptions.outDir");
        } else {
          migrator
            .set("compilerOptions.composite", true)
            .set(
              "compilerOptions.outDir",
              path(root.dir(`dist/packages`)).fromPackageRoot(),
            )
            .set("compilerOptions.declaration", true)
            .set(
              "compilerOptions.declarationDir",
              path(root.dir(`dist/types`)).fromPackageRoot(),
            )
            .set("compilerOptions.declarationMap", true);
        }

        migrator.array("exclude", (a) => a.add("dist/**/*"));

        await migrator.write();
      },
    );
  },
);
