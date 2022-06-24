import type { Command } from "commander";
import { program } from "commander";
import { join, relative, resolve } from "path";
import type { StarbeamCommandOptions } from "./commands.js";
import shell from "shelljs";
import sh from "shell-escape-tag";
import { readFileSync, write, writeFileSync } from "fs";
import { packages } from "./packages.js";
import * as jsonc from "jsonc-parser";
import { format } from "prettier";

export function TemplateCommand({ root }: StarbeamCommandOptions): Command {
  const TEMPLATES = {
    tsconfig: resolve(root, ".templates", "package", "tsconfig.json"),
  };

  return program
    .createCommand("template")
    .description("template a package")
    .argument("<dir>", "the directory of the package")
    .option(
      "-f, --file <file>",
      "instead of templating all files, pick a specific file",
      undefined
    )
    .option(
      "-t, --type <type>",
      "the type of package (demos, packages, framework)",
      "packages"
    )
    .action((dir, { file, type }) => {
      const dirs =
        dir === "all"
          ? packages(root).map((p) => p.root)
          : [resolve(root, type, dir)];

      for (const dir of dirs) {
        updatePackageJSON({ root, dir, type });
        updateTsconfig({ root, dir });
      }
    });
}

function updatePackageJSON({
  root,
  dir,
  type,
}: {
  root: string;
  type: string;
  dir: string;
}) {
  console.log(`Updating ${dir}`);
  const absoluteDir = resolve(root, type, dir);

  const splice = JSON.parse(
    readFileSync(resolve(root, ".templates", "package", "package.json"), "utf8")
  );

  const editingJSON = resolve(absoluteDir, "package.json");

  const json = JSON.parse(readFileSync(editingJSON, "utf-8"));

  json.publishConfig = splice.publishConfig;

  writeFileSync(editingJSON, JSON.stringify(json, null, 2));
}

function updateTsconfig({ root, dir }: { root: string; dir: string }) {
  const tsconfigFile = resolve(dir, "tsconfig.json");
  const tsconfig = readFileSync(tsconfigFile, "utf8");

  const tsconfigJSON = jsonc.parse(tsconfig);

  const edits = jsonc.modify(
    tsconfig,
    ["compilerOptions", "types", typeIndex(tsconfigJSON)],
    join(relative(dir, resolve(root, "packages")), "env"),
    {
      formattingOptions: {
        tabSize: 2,
        insertSpaces: true,
        insertFinalNewline: true,
      },
    }
  );

  const output = jsonc.applyEdits(tsconfig, edits);

  writeFileSync(tsconfigFile, format(output, { parser: "json" }));
}

function typeIndex(tsconfig: unknown): number {
  if (typeof tsconfig !== "object" || tsconfig === null) {
    return -1;
  }

  const types = (tsconfig as Record<string, any>)?.compilerOptions?.types;

  if (Array.isArray(types)) {
    return types.findIndex((t) => t.endsWith("/env"));
  } else {
    return -1;
  }
}
