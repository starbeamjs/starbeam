// @ts-check

import shell from "shelljs";
import { PathImpl } from "./path.js";

const DIR = PathImpl.here(import.meta).parent;
const ROOT = DIR.parent;

const PACKAGES = await ROOT.dir("@starbeam").glob("*");

console.log(await ROOT.dir("@starbeam").glob("*"));

console.log({ DIR, ROOT, PACKAGES });

const FILES = {
  config: ROOT.files("package.json", "pnpm-workspace.yaml"),
  bootstrap: await ROOT.dir(`bootstrap`, "src").glob(`**/*.ts`),
  manifests: PACKAGES.file("package.json"),
  src: (await PACKAGES.dir("src").glob("**/*.ts")).add(
    PACKAGES.dir("src").file("index.ts")
  ),
};

const CONFIG = FILES.config.watch();
CONFIG.on("change", (path) => {
  shell.exec("pnpm i");
});

// console.log(FILES);

// const SCRIPTS = dir("scripts");

// const FILES = {
//   config: [file("package.json"), file("pnpm-workspace.yaml")],
//   bootstrap: [],
// };

// const CONFIG = [file("package.json"), file("pnpm-workspace.yaml")];
// const config = new Watcher([]);
