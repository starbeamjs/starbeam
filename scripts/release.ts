import { DevCommand } from "./support/commands.js";
import sh from "shell-escape-tag";

export const Release = DevCommand("release", {
  description: "prepare the packages for publishing and release them",
}).action(async ({ workspace }) => {
  workspace.exec(sh`pnpm build`);
  workspace.exec(sh`pnpm publish -r --access public`);
});
