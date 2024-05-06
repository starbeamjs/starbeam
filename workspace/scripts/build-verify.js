import { globby } from "globby";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const currentDir = fileURLToPath(import.meta.url);

const FORBIDDEN = ["stacktracey", "@starbeam/debug", "@starbeam/verify"];
const FORBIDDEN_PATHS = [
  resolve(currentDir, '../../../packages/universal/debug'),
  resolve(currentDir, '../../../packages/universal/verify'),
];

let files = await globby(resolve(currentDir, "../../../packages/**/index.production.{js,js.map}"), {
  ignore: ["node_modules", "**/node_modules"],
});


let errors = [];

for (let filePath of files) {
  let file = await readFile(filePath);
  let content = file.toString();
  
  if (filePath.endsWith('.js.map')) {
    const jsMap = JSON.parse(content);
    const sources = jsMap.sources;
    const dir = dirname(filePath);
    for (const source of sources) {
      const resolved = resolve(dir, source);
      for (let searchFor of FORBIDDEN_PATHS) {
        if (resolved.includes(searchFor)) {
          errors.push({ filePath, found: searchFor });
        }
      }
    }
    continue;
  }

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
