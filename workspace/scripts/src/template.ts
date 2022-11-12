import { QueryCommand } from "./support/commands";
import { updateLibraryEslint } from "./support/template/update-eslint";
import { UpdatePackages } from "./support/template/update-package.js";
import { updatePackageJSON } from "./support/template/update-package-json.js";
import { updateTsconfig } from "./support/template/update-tsconfig.js";
import {
  updateDemo,
  updateLibrary,
  updateReactDemo,
  updateTests,
} from "./support/template/updates.js";

export const TemplateCommand = QueryCommand("template", {
  description: "template a package",
  notes:
    "Packages are only included if they include a `main` field in their package.json",
}).action(({ packages, workspace }) => {
  const updater = new UpdatePackages(workspace, packages);

  updater.update((when) => {
    when(() => true, "all packages").use(updatePackageJSON);
    when((pkg) => pkg.type.is("tests"), "tests").use((updater) =>
      updater.json("package.json", (prev) => {
        delete prev["publishConfig"];
        delete prev["private"];

        return {
          private: true,
          ...prev,
        };
      })
    );
    when((pkg) => pkg.isTypescript, "typescript").use(updateTsconfig);
    when((pkg) => pkg.type.is("library:public"), "published libraries").use(
      updateLibrary
    );
    when((pkg) => pkg.type.isType("library"), "libraries").use(
      updateLibraryEslint
    );
    when((pkg) => pkg.type.is("tests"), "tests").use(updateTests);
    when((pkg) => pkg.type.isType("demo"), "demos").use(updateDemo);
    when((pkg) => pkg.type.is("demo:react"), "react demos").use(
      updateReactDemo
    );
  });
});
