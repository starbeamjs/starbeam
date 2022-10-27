import { QueryCommand, StringOption } from "./support/commands";
import { UpdatePackages } from "./support/template/update-package.js";

export const GenerateCommand = QueryCommand("generate", {
  notes: "The only current generator is 'eslintrc'.",
})
  .argument("target", "what to generate", StringOption.required)
  .action((target, { workspace, packages }) => {
    if (target !== "eslintrc") {
      workspace.reporter.fatal(
        `Unknown generator '${target}' (try 'eslintrc')`
      );
    }

    const updater = new UpdatePackages(workspace, packages);

    updater.update((when) => {
      when((pkg) => pkg.type.is("library"), "libraries").use((updater) => {
        updater.json(".eslintrc.json", {
          root: false,
          parserOptions: {
            project: updater.pkg.root
              .file("tsconfig.json")
              .relativeFrom(workspace.root),
          },
          overrides: [
            {
              files: ["index.ts", "src/**/*.ts"],
              extends: ["plugin:@starbeam/tight"],
            },
          ],
        });
      });
    });
  });
