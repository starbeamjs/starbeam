/// <reference types="vite/client" />

import { createReplacePlugin } from "./replace.js";

/**
 * Replaces `import.meta` environment annotations with constants depending on
 * the specified mode.
 *
 * If no mode is specified, the mode defaults to `process.env["MODE"]`. If
 * `process.env["MODE"]` is not set, the mode defaults to `"development"`.
 *
 * If you want to control this plugin without relying on ambient environment
 * variables, you should specify the mode explicitly.
 *
 * Replacements:
 *
 * | source                 | replacement rule                                 |
 * | ---------------------- | ------------------------------------------------ |
 * | `import.meta.env.MODE` | the specified mode (string)                      |
 * | `import.meta.env.DEV`  | true if the mode is "development" (boolean)      |
 * | `import.meta.env.PROD` | true if the mode is "production" (boolean)       |
 *
 * It is possible for both `DEV` and `PROD` to be false (if the specified mode
 * is something other than `"development"` or `"production"`). In general, this
 * is not recommended when using this plugin.
 */
export default (mode = process.env["MODE"] ?? "development") => {
  const DEV = mode === "development";
  const PROD = mode === "production";
  const STARBEAM_TRACE = process.env["STARBEAM_TRACE"] ?? false;

  return createReplacePlugin(
    (id) => /\.(j|t)sx?$/.test(id),
    {
      "import.meta.env.MODE": mode,
      "import.meta.env.DEV": DEV ? "true" : "false",
      "import.meta.env.PROD": PROD ? "true" : "false",
      "import.meta.env.STARBEAM_TRACE": STARBEAM_TRACE ? "true" : "false",
    },
    true,
  );
};
