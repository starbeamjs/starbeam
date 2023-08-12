/// <reference types="vite/client" />

import { createReplacePlugin } from "./replace.js";

const MODE = process.env["MODE"] ?? "development";
const DEV = MODE === "development";
const PROD = MODE === "production";
const STARBEAM_TRACE = process.env["STARBEAM_TRACE"] ?? false;

/**
  * @typedef {object} Options 
  * @property {boolean} [cjs] set the `import.meta.env.CJS` value, default is false
  * @property {boolean} [esm] set the `import.meta.env.ESM` value, default is true
  *
  * @param {Options} [options]
  * @returns {import("rollup").Plugin}
  */
export default (options = {}) => {
  let { cjs } = options;
  let esm = options?.esm ?? !cjs;

  if ('cjs' in options && 'esm' in options) {
    throw new Error(`importMeta(): cannot set both cjs and esm options`);
  }

  return createReplacePlugin(
    (id) => /\.(j|t)sx?$/.test(id),
    {
      "import.meta.env.MODE": process.env["MODE"] ?? "development",
      "import.meta.env.DEV": DEV ? "true" : "false",
      "import.meta.env.PROD": PROD ? "true" : "false",
      "import.meta.env.STARBEAM_TRACE": STARBEAM_TRACE ? "true" : "false",
      "import.meta.env.CJS": cjs ? "true" : "false",
      "import.meta.env.ESM": esm ? "true": "false",
    },
    true
  );
};
