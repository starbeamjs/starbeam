import { isEmptyArray } from "@starbeam/core-utils";
import { Fragment, fragment } from "@starbeam-workspace/reporter";
import packageJson from "package-json";
import type { JsonObject } from "typed-json-utils";

import { QueryCommand } from "./support/commands/query-command.js";
import { StringOption } from "./support/commands/types.js";
import { UpdatePackageFn } from "./support/template/updates.js";
import { UpdatePackages } from "./support/updating/update-file.js";

export const UpdateCommand = QueryCommand(
  "update",
  "update dependencies across the entire workspace",
  {
    args: [["<package-name> The name of the package to update", StringOption]],
    options: [
      ["--version <version>", "the version of the package", StringOption],
    ],
    flags: [["--dry-run", "-d: only print what would be updated"]],
  },
).action(
  async (
    packageName,
    { workspace, packages, version: versionOption, dryRun },
  ) => {
    const updater = new UpdatePackages(workspace, packages);
    const version = versionOption ?? (await latestVersion(packageName));

    if (dryRun) {
      const todo = packages.flatMap((pkg) => {
        const deps = pkg.getDependencies(packageName);

        if (deps) {
          return deps.flatMap((dep) => {
            return isStaleVersion(dep.version, version)
              ? [[pkg.name, String(dep.kind), dep.version]]
              : [];
          });
        } else {
          return [];
        }
      });

      if (isEmptyArray(todo)) {
        workspace.reporter.ok(
          fragment`No packages with an outdated version of ${Fragment(
            "ok:header",
            packageName,
          )}`,
        );
        return;
      }

      workspace.reporter.verbose(
        (r) =>
          void r.info(
            fragment`Updating ${Fragment.ok(packageName)} to ${Fragment.header(
              version,
            )}`,
          ),
      );

      workspace.reporter.table((t) => {
        return t.headers(["Package", "Type", "Dependencies"]).rows(
          packages.flatMap((pkg) => {
            const deps = pkg.getDependencies(packageName);

            if (deps) {
              return deps.flatMap((dep) => {
                return isStaleVersion(dep.version, version)
                  ? [[pkg.name, String(dep.kind), dep.version]]
                  : [];
              });
            } else {
              return [];
            }
          }),
        );
      });
    } else {
      const updateDep = UpdatePackageFn((updater) => {
        updater.json("package.json", (packageJson: PackageJson) => {
          updateCurrent(packageJson, packageName, version);
          return packageJson;
        });
      });

      await workspace.reporter
        .group(
          fragment`Updating ${Fragment.ok(packageName)} to ${Fragment.header(
            version,
          )}`,
        )
        .verbose("header")
        .tryAsync(async () => {
          await updater.update((when) =>
            when((pkg) => pkg.hasDependency(packageName), "package").use(
              updateDep,
            ),
          );
        });
    }
  },
);

function updateCurrent(pkg: PackageJson, name: string, version: string): void {
  updateCurrentIn(pkg.dependencies, name, version);
  updateCurrentIn(pkg.devDependencies, name, version);
  updateCurrentIn(pkg.peerDependencies, name, version);
  updateCurrentIn(pkg.optionalDependencies, name, version);
}

function updateCurrentIn(
  deps: Record<string, string> | undefined,
  name: string,
  version: string,
): void {
  if (deps === undefined) return;

  if (name in deps) {
    deps[name] = `^${version}`;
  }
}

function isStaleVersion(pkg: string, expected: string) {
  return pkg !== `^${expected}`;
}

interface PackageJson extends JsonObject {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

async function latestVersion(packageName: string): Promise<string> {
  const { version } = await packageJson(packageName.toLowerCase());
  return version as string;
}
