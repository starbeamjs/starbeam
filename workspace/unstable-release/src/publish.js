import { execaCommand } from "execa";
import { dirname } from "path";

import { listPublicWorkspaces } from "./workspaces.js";

/** @typedef {{stderr:string}} ExecaError */

async function publish() {
  let publicWorkspaces = await listPublicWorkspaces();

  /** @type {string[]} */
  const errors = [];

  for (let workspace of publicWorkspaces) {
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
