import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import * as TJS from "typescript-json-schema";

const __dirname = new URL(".", import.meta.url).pathname;

/**
 * @param {{outdir: string}} options
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

  writeFileSync(
    resolve(outdir, "command.json"),
    JSON.stringify(schema, null, 2),
  );
}
