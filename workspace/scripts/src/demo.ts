import { execSync } from "node:child_process";

import sh from "shell-escape-tag";

import { DevCommand } from "./support/commands/dev-command";
import { StringOption } from "./support/commands/types";

export const DemoCommand = DevCommand("demo", "run the demo", {
  args: [["the name of the demo to run", StringOption.required]],
  options: {
    "--port": ["the port to run the demo on", StringOption.default("3001")],
    "--host": [
      "the host to run the demo on",
      StringOption.default("localhost"),
    ],
  },
  flags: {
    "--no-strict": "fail if the port is already in use",
  },
}).action((name, { port, host, workspace, strict }) => {
  const cmd = sh`vite --port ${port} --host ${host} -c ${workspace.paths
    .demo(name)
    .file("vite.config.ts")} ${strict ? "--strictPort" : ""}`;

  execSync(cmd, {
    stdio: "inherit",
    cwd: workspace.paths.demo(name),
  });
});
