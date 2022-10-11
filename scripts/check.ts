import { DevCommand } from "./support/commands.js";

export const CheckCommand = DevCommand("check", {
  description: "run all of the checks",
})
  .flag(["-f", "failFast"], `exit on first failure`)
  .action(async ({ workspace }) => {
    const results = await workspace.check(
      ["unused", "pnpm check:unused -f"],
      ["types", "pnpm check:types"],
      ["lint", "pnpm check:lint"]
    );

    workspace.reporter.reportCheckResults(results, {
      success: "all checks succeeded",
      header: "check",
    });
  });
