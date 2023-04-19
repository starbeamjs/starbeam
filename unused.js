//@ts-check
import { execSync } from "child_process";

const args = process.argv.slice(2);
const update = args.includes("--update");

/**
 * @typedef {{name: string, version: string, path: string, private:boolean}} Package
 */

/**
 * @type {Package[]}
 */
const packages = JSON.parse(
  execSync("pnpm ls -r --depth -1 --json", {
    encoding: "utf-8",
  })
);

for (const pkg of packages) {
  checkPackage(pkg);
}

/**
 * @param {Package} pkg
 */
function checkPackage(pkg) {
  if (pkg.name === "@starbeam-workspace/root") {
    console.log("Skipping root");
    return;
  }

  console.group("Checking package", pkg.name);
  try {
    execSync(
      `npm-check ${update ? "-u" : ""} -i rollup --specials eslint,babel`,
      {
        cwd: pkg.path,
        stdio: "inherit",
      }
    );
  } catch (e) {
    console.log();
    console.error("Unused dependencies in package", pkg.name);
    console.log("Please fix them and then continue");
    process.exit(1);
  } finally {
    console.groupEnd();
  }
}
