// @ts-check

import swc from "@swc/core";
import glob from "fast-glob";
import { writeFileSync } from "fs";
import * as path from "path";
import shell from "shelljs";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

let root = path.resolve(dirname, "..", "bootstrap", "src");
let dist = path.resolve(root, "..", "dist");

shell.rm("-rf", dist);
shell.mkdir("-p", dist);

let bootstrap = path.resolve(root, "**/*.ts");
let files = glob.sync(bootstrap).filter((file) => !file.endsWith(".d.ts"));

console.log(`- Compiling bootstrap`);

for (let sourceFile of files) {
  let relative = path.relative(root, sourceFile);
  let outputFile = path.resolve(dist, relative).replace(/[.]ts$/, ".js");

  let output = await compile(sourceFile, outputFile);

  if (process.env["TRACE_BOOTSTRAP"]) {
    console.log(`- ${outputFile}`);
  }
  writeFileSync(outputFile, output.code);
}

/**
 * @param {string} sourceFile
 * @param {string} outputFile
 */
async function compile(sourceFile, outputFile) {
  let output = swc.transformFileSync(sourceFile, {
    sourceMaps: "inline",
    inlineSourcesContent: true,
    jsc: {
      parser: {
        syntax: "typescript",
        decorators: true,
      },
      target: "es2022",
    },
    filename: sourceFile,
    outputPath: outputFile,
  });

  return output;
}
