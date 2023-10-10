import { findWorkspaceDir } from "@pnpm/find-workspace-dir";

export function fatal(_: never): never {
  throw Error("Unreachable");
}

export async function findRoot(meta: ImportMeta): Promise<string> {
  const cwd = new URL(meta.url).pathname;
  const root = await findWorkspaceDir(cwd);

  if (!root) {
    throw Error(`No ancestor of ${cwd} is a pnpm workspace`);
  }

  return root;
}
