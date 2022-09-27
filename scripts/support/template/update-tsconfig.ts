import chalk from "chalk";
import type { Workspace } from "../workspace.js";
import type { UpdatePackage } from "./update-package.js";

export function updateTsconfig(
  updater: UpdatePackage,
  workspace: Workspace
): void {
  const relativeParent = updater.relative(updater.pkg.root.parent);

  const editor = updater.jsonEditor("tsconfig.json");

  editor.remove("compilerOptions.emitDeclarationOnly");

  editor.addUnique(
    "compilerOptions.types",
    updater.relative(workspace.paths.packages.file("env")),
    (type) => typeof type === "string" && type.endsWith("/env")
  );

  if (updater.type === "demo:react") {
    const path = updater.relative(
      workspace.paths.packages.x.dir("devtool").file("tsconfig.json")
    );

    editor.addUnique(
      "references",
      {
        path,
      },
      (reference) => isObject(reference) && reference.path === path
    );
  }

  if (updater.tsconfig) {
    editor.set(
      "extends",
      updater.relative(
        workspace.root.file(`.config/tsconfig/${updater.tsconfig}`)
      ),
      { position: 0 }
    );
  } else if (
    updater.type === "library" ||
    updater.type === "interfaces" ||
    updater.type === "support:tests"
  ) {
    editor.set(
      "extends",
      updater.relative(
        workspace.root.file(".config/tsconfig/tsconfig.-package.json")
      ),
      { position: 0 }
    );
  } else if (updater.type === "demo:react") {
    editor.set(
      "extends",
      updater.relative(
        workspace.root.file(`.config/tsconfig/tsconfig.react-demo.json`)
      ),
      { position: 0 }
    );
  } else {
    updater.error((root) =>
      console.error(chalk.red(`${root} is an unknown type: ${updater.type}`))
    );
    process.exit(1);
  }

  editor.set("compilerOptions.composite", true);
  editor.set(
    "compilerOptions.outDir",
    updater.relative(workspace.root.dir(`dist/packages`))
  );
  editor.set("compilerOptions.declaration", true);
  editor.set(
    "compilerOptions.declarationDir",
    updater.relative(workspace.root.dir(`dist/types`))
  );

  editor.set("compilerOptions.declarationMap", true);

  editor.addUnique("exclude", "dist/**/*");

  const changed = editor.write();

  if (changed) {
    updater.change(changed, "tsconfig.json");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
