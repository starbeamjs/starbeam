// @ts-check

import doc from "./shared.js";

const name = process.argv[2];
const args = process.argv.slice(3);

if (name === undefined) {
  console.log("Usage: doc DIRECTORY ...DOCUMENTARY_ARGS");
  process.exit(1);
}

doc(name, { args });
