import findWorkspaceDir from "@pnpm/find-workspace-dir";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Workspace } from "./compile.js";

const dir = dirname(fileURLToPath(import.meta.url));
const root = await findWorkspaceDir.default(dir);

if (root === undefined) {
  console.error(`Couldn't find workspace root from ${dir}`);
  process.exit(1);
}

const WORKSPACE = await Workspace.create(root, "@starbeam");

// console.log({ root, packages: WORKSPACE.packages });

for (let pkg of WORKSPACE.packages) {
  await pkg.compile({ dryRun: false });
  break;
}
