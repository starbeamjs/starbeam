/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { execaCommand } from "execa";
import fse from 'fs-extra';
import latestVersion from 'latest-version';
import { dirname } from "path";

import { listPublicWorkspaces } from "./workspaces.js";

/** @typedef {{stderr:string}} ExecaError */

async function publish() {
  let publicWorkspaces = await listPublicWorkspaces();

  console.info(`The public workspaces to be published`);
  console.info(publicWorkspaces);

  /** @type {string[]} */
  const errors = [];

  for (let workspace of publicWorkspaces) {
    // @ts-ignore
    let manifest = fse.readJsonSync(workspace); 
    let current = manifest['version'];
    let name = manifest['name'];
    let latest = await latestVersion(name, { version: 'unstable' }); 

    if (latest === current) {
      console.info(`${name} is already published`);
      continue;
    }

    console.info(`Publishing ${workspace}`);
    try {
      await execaCommand(
        "npm publish --tag=unstable --verbose --access=public",
        {
          cwd: dirname(workspace),
        },
      );
    } catch (err) {
      console.info(
        `Publishing ${workspace} has failed. A full list of errors will be printed at the end of this run`,
      );

      if (isErr(err)) {
        errors.push(err.stderr);
      }
      continue;
    }

    console.info(`Publishing ${workspace} completed successfully!`);
  }

  if (errors.length) {
    console.error("Errors were encountered while publishing these packages");
    errors.forEach((error) => void console.log(error));
    process.exit(1);
  }
}

await publish();

/**
 * @param {unknown} error
 * @returns {error is {stderr: string}}
 */
function isErr(error) {
  if (typeof error !== "object" || !error) return false;

  return "stderr" in error && typeof error.stderr === "string";
}
