import { execSync } from "child_process";
import type { Command } from "commander";
import { program } from "commander";
import { resolve } from "path";
import sh from "shell-escape-tag";
import type { StarbeamCommandOptions } from "./commands.js";

export function DemoCommand({ root }: StarbeamCommandOptions): Command {
  return program
    .command("demo")
    .description("run a demo")
    .argument("<name>", "the name of the demo (a subdirectory of <root>/demos)")
    .option("-p, --port <port>", "the port to run vite on", "3001")
    .option("-h, --host <host>", "the host to run vite on", "localhost")
    .option("-s, --strict", "fail if the port is already in use", true)
    .action((name, { port, host, strict }) => {
      const cmd = sh`vite --port ${port} --host ${host} -c ${root}/demos/${name}/vite.config.ts ${
        strict ? "--strictPort" : ""
      }`;

      execSync(cmd, {
        stdio: "inherit",
        cwd: resolve(root, "demos", name),
      });
    });
}
