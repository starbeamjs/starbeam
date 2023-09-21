import { QueryCommand } from "./support/commands/query-command";
import { updateEslint } from "./support/template/update-eslint";
import { UpdatePackages } from "./support/template/update-package.js";
import { updatePackageJSON } from "./support/template/update-package-json.js";
import { updateTests } from "./support/template/update-tests.js";
import { updateTsconfig } from "./support/template/update-tsconfig.js";
import { updateDemo, updateRollup } from "./support/template/updates.js";

export const TemplateCommand = QueryCommand("template", {
  description: "template a package",
  notes:
    "Packages are only included if they include a `main` field in their package.json",
}).action(async ({ packages, workspace }) => {
  const updater = new UpdatePackages(workspace, packages);

  await updater.update((when) => {
    when(() => true, "all packages").use(updatePackageJSON);
    when((pkg) => pkg.type.is("tests"), "tests").use(updateTests);
    when((pkg) => pkg.isTypescript, "typescript").use(updateTsconfig);
    when((pkg) => pkg.type.is("library:public"), "published libraries").use(
      updateRollup,
    );
    when(
      (pkg) =>
        pkg.sources.some((s) => s.hasFiles()) &&
        (pkg.type.isType("library") || pkg.type.is("tests")),
      "libraries",
    ).use(updateEslint.package);
    when((pkg) => pkg.type.isType("demo"), "demos").use(updateDemo);
  });
});
