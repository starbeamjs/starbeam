import type { Package, TsConfig } from "@starbeam-workspace/package";
import { StarbeamType } from "@starbeam-workspace/package";
import { writeFileSync } from "fs";
import type { Directory } from "trailway";

import type { Migrator } from "../jsonc/migration.js";
import { UpdatePackageFn } from "./updates.js";

export const updateTsconfig = UpdatePackageFn(
  async (updater, { workspace, root }) => {
    const { path, pkg } = updater;
    await updater.json.migrate(
      "tsconfig.json",
      async (migrator: Migrator<TsConfig>) => {
        migrator.array("compilerOptions.types", (update) =>
          update.add(path(root.file("packages/env.d.ts")).fromPackageRoot(), {
            matches: (type) =>
              type.endsWith("/env") || type.endsWith("/env.d.ts"),
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
          updater.pkg.type.hasCategory("library") ||
          updater.pkg.type.is("tests")
        ) {
          migrator.set(
            "extends",
            path(
              root.file(".config/tsconfig/tsconfig.shared.json"),
            ).fromPackageRoot(),
            "start",
          );
        } else if (pkg.type.hasCategory("demo")) {
          migrator.remove("references");
          migrator.set(
            "extends",
            path(
              root.file(".config/tsconfig/tsconfig.demo.json"),
            ).fromPackageRoot(),
          );
        } else if (pkg.type.is("root") || pkg.type.hasCategory("extracting")) {
          // do nothing
        } else {
          workspace.reporter.fatal(
            `${String(pkg.root)} is an unknown type: ${String(
              pkg.type,
            )}.\n\nIt should be one of:\n\n${StarbeamType.format()}`,
          );
        }

        migrator.remove("compilerOptions.outDir");

        if (pkg.type.hasCategory("demo")) {
          migrator
            .remove("compilerOptions.composite")
            .remove("compilerOptions.declaration")
            .remove("compilerOptions.declarationMap")
            .remove("compilerOptions.declarationDir")
            .remove("compilerOptions.emitDeclarationOnly")
            .set("compilerOptions.noEmit", true);
        } else {
          migrator
            .set("compilerOptions.declaration", true)
            .set("compilerOptions.emitDeclarationOnly", true)
            .set(
              "compilerOptions.declarationDir",
              path(distRoot(pkg)).fromPackageRoot(),
            )
            .set("compilerOptions.declarationMap", true);

          if (pkg.type.hasCategory("extracting")) {
            migrator.remove("compilerOptions.composite");
          } else {
            // @todo composite should be controlled by metadata
            // that explicitly declares the package to be a reference
            migrator.set("compilerOptions.declaration", true);
          }
        }

        migrator.array("exclude", (a) => a.add("dist/**/*"));

        await migrator.write((source) => {
          writeFileSync(
            updater.pkg.root.file("tsconfig.json").absolute,
            source,
          );
        });
      },
    );
  },
);

function distRoot(pkg: Package): Directory {
  if (pkg.type.is("extracting:library")) {
    return pkg.root.dir("dist/types");
  } else if (pkg.type.is("extracting:tests")) {
    return pkg.root.parent.dir("dist/types/tests");
  } else {
    return pkg.workspace.root.dir("dist/types");
  }
}
