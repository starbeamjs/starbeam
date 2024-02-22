import { readFileSync } from "node:fs";

import type { RollupPlugin } from "../utils.js";

const INLINE_PREFIX = "\0inline:";

/**
 * Inlines any imports that end in `?inline` into the importing module as a
 * string.
 *
 * This adds Vite's `?inline` feature to standalone rollup builds.
 */
export default (): RollupPlugin => {
  return {
    name: "inline",

    async resolveId(source, importer, options) {
      const path = removeTrailing(source, "?inline");

      if (path) {
        const resolved = await this.resolve(path, importer, options);

        if (resolved && !resolved.external) {
          await this.load(resolved);
          return INLINE_PREFIX + resolved.id;
        }
      }
    },

    async load(id) {
      if (id.startsWith(INLINE_PREFIX)) {
        const path = id.slice(INLINE_PREFIX.length);
        const code = readFileSync(path, "utf8");

        return Promise.resolve({
          code: `export default ${JSON.stringify(code)};`,
        });
      }
    },
  };
};

const FIRST_CHAR = 0;

function removeTrailing(source: string, trailing: string): string | undefined {
  if (source.endsWith(trailing)) {
    return source.slice(FIRST_CHAR, -trailing.length);
  }
}
