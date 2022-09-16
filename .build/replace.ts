// originally from: https://github.com/vitejs/vite/blob/51e9c83458e30e3ce70abead14e02a7b353322d9/src/node/build/buildPluginReplace.ts

import type { TransformResult } from "rollup";
import MagicString from "magic-string";

export function createReplacePlugin(
  test: (id: string) => boolean,
  replacements: Record<string, string>,
  sourcemap: boolean
) {
  const pattern = new RegExp(
    "\\b(" +
      Object.keys(replacements)
        .map((str) => {
          return str.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
        })
        .join("|") +
      ")\\b",
    "g"
  );

  return {
    name: "starbeam:replace",
    /**
     * @param {string} code
     * @param {string} id
     * @returns {import("rollup").TransformResult}
     */
    transform(code: string, id: string): TransformResult {
      if (test(id)) {
        const s = new MagicString(code);
        let hasReplaced = false;
        let match;

        while ((match = pattern.exec(code))) {
          hasReplaced = true;
          const start = match.index;
          const end = start + match[0].length;
          const replacement = replacements[match[1]];
          s.overwrite(start, end, replacement);
        }

        if (!hasReplaced) {
          return null;
        }

        const result: TransformResult = { code: s.toString() };
        if (sourcemap) {
          result.map = s.generateMap({ hires: true });
        }
        return result;
      }
    },
  };
}
