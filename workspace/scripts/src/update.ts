import type { JsonObject } from "@starbeam-workspace/json";
import { Fragment, fragment } from "@starbeam-workspace/reporter";
import packageJson from "package-json";

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
      ["--version <version>", "-v: the version of the package", StringOption],
    ],
  },
).action(
  async (packageName, { workspace, packages, version: versionOption }) => {
    const updater = new UpdatePackages(workspace, packages);
    const version = versionOption ?? (await latestVersion(packageName));

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
    deps[name] = version;
  }
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
