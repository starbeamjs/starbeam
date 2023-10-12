import { QueryCommand } from "./support/commands/query-command.js";
import { updateEslintrc } from "./support/template/update-eslint.js";
import { updatePackageJSON } from "./support/template/update-package-json.js";
import { updateTsconfig } from "./support/template/update-tsconfig.js";
import { updateRollup } from "./support/template/updates.js";
import { UpdatePackages } from "./support/updating/update-file.js";

export const TemplateCommand = QueryCommand("template", "template a package", {
  notes:
    "Packages are only included if they include a `main` field in their package.json",
}).action(async ({ packages, workspace }) => {
  const updater = new UpdatePackages(workspace, packages);

  await updater.update((when) => {
    when(() => true, "all packages").use(updatePackageJSON, updateEslintrc);
    when((pkg) => pkg.isTypescript, "typescript").use(updateTsconfig);
    when((pkg) => pkg.type.is("library:public"), "published libraries").use(
      updateRollup,
    );
  });
});
