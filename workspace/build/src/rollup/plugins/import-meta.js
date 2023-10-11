/// <reference types="vite/client" />

import { createReplacePlugin } from "../../replace.js";

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
