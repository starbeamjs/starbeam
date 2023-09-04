import { execaCommand } from "execa";
import { listPublicWorkspaces } from "./workspaces.js";
import { dirname } from "path";

async function publish() {
  let publicWorkspaces = await listPublicWorkspaces();

  const errors = [];

  for (let workspace of publicWorkspaces) {
    console.info(`Publishing ${workspace}`);
    try {
      await execaCommand("npm publish --tag=unstable --verbose --access=public", {
        cwd: dirname(workspace),
      });
    } catch (err) {
      console.info(
        `Publishing ${workspace} has failed. A full list of errors will be printed at the end of this run`
      );
      errors.push(err);
      continue;
    }

    console.info(`Publishing ${workspace} completed successfully!`);
  }

  if (errors.length) {
    console.error("Errors were encountered while publishing these packages");
    errors.forEach((error) => console.log(error.stderr));
    process.exit(1);
  }
}

publish();
