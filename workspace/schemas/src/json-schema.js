import { exec } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import * as TJS from "typescript-json-schema";

const __dirname = new URL(".", import.meta.url).pathname;

/**
 * @param {{outdir: string}} options
 * @returns {void}
 */
export default function generate({ outdir }) {
  /**
   * @satisfies {TJS.PartialArgs}
   */
  const settings = {
    required: true,
  };

  /**
   * @satisfies {TJS.CompilerOptions}
   */
  const compilerOptions = {
    strictNullChecks: true,
  };

  const program = TJS.getProgramFromFiles(
    [resolve(__dirname, "schemas", "command.d.ts")],
    compilerOptions,
  );

  // We can either get the schema for one file and one type...
  const schema = TJS.generateSchema(program, "Command", settings);

  const outFile = resolve(outdir, "command.json");

  writeFileSync(outFile, JSON.stringify(schema, null, 2));
  exec(`eslint ${outFile} --fix`, { cwd: outdir });
}
