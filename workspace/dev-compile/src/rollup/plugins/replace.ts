// originally from: https://github.com/vitejs/vite/blob/51e9c83458e30e3ce70abead14e02a7b353322d9/src/node/build/buildPluginReplace.ts

import type { TransformResult } from "rollup";

import type { RollupPlugin } from "../utils.js";

const { default: MagicString } = await import("magic-string");

/** @typedef {import("rollup").TransformResult} TransformResult */
/** @typedef {import("rollup").Plugin} RollupPlugin */

/**
 * Replace literal strings in code with specified replacements with sourcemap
 * support.
 *
 * Example rollup config:
 *
 * ```js
 * import { replace } from "@starbeam-dev/compile";
 *
 * export default {
 *   // ...
 *   plugins: [
 *     replace({ "import.meta.hello": `"world"` })
 *   ]
 * };
 * ```
 *
 * This will replace any instances of `import.meta.hello` in source modules with
 * the content `"world"`.
 *
 * The main purpose of this plugin is to replace dynamic variables with
 * build-time constant values, which can then be further processed by a
 * minification pass.
 *
 * For example, the `importMeta` plugin replaces `import.meta.env.DEV` with
 * `true` in development mode and `false` in production mode. In production,
 * source code guarded with `if (import.meta.env.DEV)` will be emitted as `if
 * (false)`. The subsequent minification pass will remove the entire `if` block,
 * including its contents.
 *
 * @param {(id: string) => boolean} test
 * @param {Record<string, string>} replacements @param {boolean} sourcemap
 *
 * @returns {RollupPlugin}
 */
export function createReplacePlugin(
  test: (id: string) => boolean,
  replacements: Record<string, string>,
  sourcemap: boolean,
): RollupPlugin {
  const pattern = new RegExp(
    "\\b(" +
    Object.keys(replacements)
      .map((str) => {
        return str.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
      })
      .join("|") +
    ")\\b",
    "g",
  );

  return {
    name: "starbeam:replace",

    transform(code: string, id: string): TransformResult {
      if (test(id)) {
        const s = new MagicString(code);
        let hasReplaced = false;

        let match: RegExpMatchArray | null;

        while ((match = pattern.exec(code))) {
          hasReplaced = true;
          const start = match.index as number;
          const [wholeMatch, partialMatch] = match as [string, string];

          const end = start + wholeMatch.length;
          const replacement = replacements[partialMatch];

          if (replacement === undefined) {
            throw new Error(
              `Unexpected missing replacement for "${partialMatch}".\n\nReplacements were ${JSON.stringify(
                replacements,
                null,
                STRINGIFY_SPACES,
              )}`,
            );
          }

          s.overwrite(start, end, replacement);
        }

        if (!hasReplaced) {
          return null;
        }

        /** @type {TransformResult} */
        const result: TransformResult = { code: s.toString() };
        if (sourcemap) {
          result.map = s.generateMap({ hires: true });
        }
        return result;
      }
    },
  };
}

const STRINGIFY_SPACES = 2;
