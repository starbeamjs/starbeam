/* eslint-disable no-console */
import { readPackageJson, writePackageJson } from "./read-package-json.js";
import { currentSHA, listPublicWorkspaces } from "./workspaces.js";

/**
 * @type {Record<string, string>}
 */
const NEW_VERSIONS = {};

/**
 * This is an I/O heavy way to do this, but hopefully it reads easy
 */
async function updateVersions() {
  let sha = await currentSHA();
  console.log("sha", sha);

  let publicWorkspaces = await listPublicWorkspaces();
  console.log("# workspaces", publicWorkspaces.length);

  // Pick new versions for each package
  for (let workspace of publicWorkspaces) {
    console.info(`Setting version of ${workspace}`);
    await setVersion(sha, workspace);
  }

  // Update each dependency to use the new versions
  for (let workspace of publicWorkspaces) {
    console.info(`Updating dependencies of ${workspace}`);
    await updateDependencies(workspace);
  }
}

await updateVersions();

////////////////////////////////////////////

/**
 *
 * @param {string} sha
 * @param {string} filePath
 * @returns {Promise<void>}
 */
async function setVersion(sha, filePath) {
  let json = await readPackageJson(filePath);

  if (!json.name) {
    console.info(`Skipping package at ${filePath} as it has no name`);
    return;
  }

  if (!json.version) {
    console.info(`Skipping ${json.name} at ${filePath} as it has no version`);
    return;
  }

  // we need to at the very least bump the patch version of the unstable
  // packages so that ^ dependenies won't pick up the stable versions
  const [major, minor, patch] = json.version.split(".");

  json.version = `${major}.${minor}.${
    patch ? parseInt(patch) + 1 : 0
  }-unstable.${sha}`;

  NEW_VERSIONS[json.name] = json.version;

  await writePackageJson(filePath, json);
}

/**
 * @param {string} filePath
 */
async function updateDependencies(filePath) {
  let json = await readPackageJson(filePath);

  for (let [dep, version] of Object.entries(NEW_VERSIONS)) {
    const deps = json.dependencies || {};
    if (deps[dep]) {
      json.dependencies = { ...deps, [dep]: version };
    }

    const devDeps = json.devDependencies || {};
    if (devDeps[dep]) {
      json.devDependencies = { ...devDeps, [dep]: version };
    }

    const peerDeps = json.peerDependencies || {};
    if (peerDeps[dep]) {
      json.peerDependencies = { ...peerDeps, [dep]: version };
    }
  }

  await writePackageJson(filePath, json);
}
