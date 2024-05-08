import { execaCommand } from "execa";
import { globby } from "globby";

import { readPackageJson } from "./read-package-json.js";

/**
 * All publishable packages are in packages/*
 *
 * We could read package.json#workspaces, but then we'd have more to filter
 * out.
 */
export async function listPublicWorkspaces() {
  let filePaths = await globby(["packages/**/package.json"], {
    gitignore: true,
    ignore: ["**/tests/**", "**/node_modules/**"],
  });

  // eslint-disable-next-line no-console
  console.log("filePaths", filePaths.length);

  let result = [];

  for (let filePath of filePaths) {
    let packageJson = await readPackageJson(filePath);

    if (packageJson.private) continue;

    result.push(filePath);
  }

  return result;
}

export async function currentSHA() {
  let { stdout } = await execaCommand(`git rev-parse --short HEAD`);

  return stdout.trim();
}
