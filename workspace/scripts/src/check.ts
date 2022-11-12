import { DevCommand } from "./support/commands.js";

export const CheckCommand = DevCommand("check", {
  description: "run all of the checks",
}).action(async ({ workspace }) => {
  const results = await workspace.check(
    ["unused", "pnpm check:unused -f"],
    ["types", "pnpm test:workspace:types"],
    ["lint", "pnpm test:workspace:lint"]
  );

  workspace.reporter.reportCheckResults(results, {
    success: "all checks succeeded",
    header: "check",
  });
});
