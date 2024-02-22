import { globby } from "globby";
import { readFile } from "node:fs/promises";

const FORBIDDEN = ["stacktracey", "@starbeam/debug", "@starbeam/verify"];

let files = await globby("**/index.production.js", {
  ignore: ["node_modules", "**/node_modules"],
});

let errors = [];

for (let filePath of files) {
  let file = await readFile(filePath);
  let content = file.toString();

  for (let searchFor of FORBIDDEN) {
    if (content.includes(searchFor)) {
      errors.push({ filePath, found: searchFor });
    }
  }
}

if (errors.length > 0) {
  console.error(errors);
  throw new Error(`The forbidden texts were encountered in the above files`);
}

console.info("No forbidden texts!");
