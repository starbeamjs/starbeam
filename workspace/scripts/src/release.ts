import sh from "shell-escape-tag";

import { DevCommand } from "./support/commands/dev-command";

export const ReleaseCommand = DevCommand(
  "release",
  "prepare the packages for publishing and release them",
).action(async ({ workspace }) => {
  await workspace.exec(sh`pnpm build`);
  await workspace.exec(sh`pnpm publish -r --access public`);
});
