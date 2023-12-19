/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { dirname } from "node:path";

import { execaCommand } from "execa";
import fse from "fs-extra";
import latestVersion from "latest-version";

import { listPublicWorkspaces } from "./workspaces.js";

/** @typedef {{stderr:string}} ExecaError */

async function publish() {
  let publicWorkspaces = await listPublicWorkspaces();

  console.info(`The public workspaces to be published`);
  console.info(publicWorkspaces);

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const erroredPackages = [];

  for (let workspace of publicWorkspaces) {
    // @ts-ignore
    let manifest = fse.readJsonSync(workspace);
    let current = manifest["version"];
    let name = manifest["name"];

    try {
      let latest = await latestVersion(name, { version: "unstable" });

      if (latest === current) {
        console.info(`${name} is already published`);
        continue;
      }
    } catch (e) {
      // This'll happen for packages that haven't been published yet.
      // We don't want to log too much -- we can just move to publishing
      // @ts-ignore
      let isIgnored = e.constructor?.name?.includes("VersionNotFoundError");

      if (!isIgnored) {
        // @ts-ignore
        let errorText = e.message || e;
        console.error(errorText);
      }
    }

    console.info(`Publishing ${workspace}`);
    try {
      await execaCommand(
        "pnpm publish --tag unstable --access public --no-git-checks",
        {
          cwd: dirname(workspace),
        },
      );
    } catch (err) {
      console.info(
        `Publishing ${workspace} has failed. A full list of errors will be printed at the end of this run`,
      );

      if (isErr(err)) {
        /** @type {any} */
        let out = err;
        errors.push(`${out.stdout ?? ""} ${err.stderr}`);
        erroredPackages.push(name);
      }
      continue;
    }

    console.info(`Publishing ${workspace} completed successfully!`);
  }

  if (errors.length) {
    console.error("Errors were encountered while publishing these packages");
    errors
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((error) => void console.log(error));

    console.info(
      "------------------------------------------\n" +
        "   Packages that failed to publish\n" +
        "------------------------------------------\n",
    );

    erroredPackages.forEach((error) => void console.log(error));
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
