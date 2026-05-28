import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = 4321;
const baseURL = `http://${host}:${port}`;
const packageManager = shellQuote(process.env.npm_execpath ?? "pnpm");

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: "list",
  testDir: "./e2e",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `${packageManager} build && ${packageManager} preview --host ${host} --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `${baseURL}/demos/`,
  },
});
