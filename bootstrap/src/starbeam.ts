import findWorkspaceDir from "@pnpm/find-workspace-dir";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "./log.js";
import { AbsolutePath } from "./paths.js";
import { Workspace } from "./workspace.js";

log.heading("- Compiling packages...");

const dir = dirname(fileURLToPath(import.meta.url));
const root = await findWorkspaceDir.default(dir);

if (root === undefined) {
  console.error(`Couldn't find workspace root from ${dir}`);
  process.exit(1);
}

const WORKSPACE = await Workspace.create({
  root: AbsolutePath.directory(root),
  namespace: "@starbeam",
  // TODO: Hash the bootstrap source
  hash: "7ce9ed81-b07a-4000-916d-c0fc40e0a6a6",
  // hash: String(Math.random()),
});

for (let pkg of WORKSPACE.packages) {
  // log.heading(`- Compiling ${pkg.name}`);
  await pkg.compile({ dryRun: false });
}

log.heading("- Done");

function relative(path: AbsolutePath): string {
  return path.relativeFromAncestor(WORKSPACE.root);
}
