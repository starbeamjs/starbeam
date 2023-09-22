import fse from "fs-extra";

/**
 * @typedef {{private?: boolean; version?: string; name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string>; optionalDependencies?: Record<string, string>;}} PackageJson
 */

/**
 *
 * @param {string} path
 * @returns {Promise<PackageJson>}
 */
export async function readPackageJson(path) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return fse.readJSON(path);
}

/**
 * @param {string} path
 * @param {PackageJson} packageJson
 */
export async function writePackageJson(path, packageJson) {
  await fse.writeJSON(path, packageJson, { spaces: 2 });
}
