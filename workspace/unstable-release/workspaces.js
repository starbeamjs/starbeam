import globby from "globby";
import { execaCommand } from "execa";
import fse from "fs-extra";

/**
 * All publishable packages are in packages/*
 *
 * We could read package.json#workspaces, but then we'd have more to filter out.
 */
export async function listPublicWorkspaces() {
  let filePaths = await globby(["packages/**/package.json"]);

  let result = [];

  for (let filePath of filePaths) {
    let packageJson = await fse.readJSON(filePath);

    if (packageJson.private) continue;

    result.push(filePath);
  }

  return result;
}

export async function currentSHA() {
  let { stdout } = await execaCommand(`git rev-parse --short HEAD`);

  return stdout.trim();
}
