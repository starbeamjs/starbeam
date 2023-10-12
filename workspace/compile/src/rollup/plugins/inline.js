import { readFileSync } from "node:fs";

const INLINE_PREFIX = "\0inline:";

/**
 * Inlines any imports that end in `?inline` into the importing module as a
 * string.
 *
 * This adds Vite's `?inline` feature to standalone rollup builds.
 *
 * @returns {import("rollup").Plugin}
 */
export default () => {
  return {
    name: "inline",

    async resolveId(source, importer, options) {
      if (source.endsWith("?inline")) {
        const path = source.slice(0, -7);
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
