import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { DevCommand, StringOption } from "./support/commands.js";
import sh from "shell-escape-tag";

export const DemoCommand = DevCommand("demo", {
  description: "run the demo",
})
  .argument("name", "the name of the demo to run", StringOption.required)
  .option(
    ["-p", "port"],
    "the port to run the demo on",
    StringOption.default("3001")
  )
  .option(
    ["-h", "host"],
    "the host to run the demo on",
    StringOption.default("localhost")
  )
  .flag(["-S", "strict"], "fail if the port is already in use", {
    default: true,
  })
  .action((name, { port, host, root, strict }) => {
    const cmd = sh`vite --port ${port} --host ${host} -c ${root}/demos/${name}/vite.config.ts ${
      strict ? "--strictPort" : ""
    }`;

    execSync(cmd, {
      stdio: "inherit",
      cwd: resolve(root, "demos", name),
    });
  });
