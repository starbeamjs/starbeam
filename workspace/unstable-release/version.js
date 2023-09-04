import fse from "fs-extra";
import { listPublicWorkspaces, currentSHA } from "./workspaces.js";

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

updateVersions();

////////////////////////////////////////////

const NEW_VERSIONS = {};

async function setVersion(sha, filePath) {
  let json = await fse.readJSON(filePath);

  if (!json.version) {
    console.info(`Skipping ${json.name} as it has no version`);
    return;
  }

  // we need to at the very least bump the patch version of the unstable packages so
  // that ^ dependenies won't pick up the stable versions
  const [major, minor, patch] = json.version.split(".");

  json.version = `${major}.${minor}.${parseInt(patch) + 1}-unstable.${sha}`;

  NEW_VERSIONS[json.name] = json.version;

  await fse.writeJSON(filePath, json, { spaces: 2 });
}

async function updateDependencies(filePath) {
  let json = await fse.readJSON(filePath);

  for (let [dep, version] of Object.entries(NEW_VERSIONS)) {
    if ((json.dependencies || {})[dep]) {
      json.dependencies[dep] = version;
    }

    if ((json.devDependencies || {})[dep]) {
      json.devDependencies[dep] = version;
    }

    if ((json.peerDependencies || {})[dep]) {
      json.peerDependencies[dep] = version;
    }
  }

  await fse.writeJSON(filePath, json, { spaces: 2 });
}
