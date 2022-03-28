/// <reference path="../types/upstream.d.ts" />

import * as picomatch from "picomatch-browser";

export function capture({ path, pattern }: { path: string; pattern: string }) {
  const re = picomatch.makeRe(pattern, { capture: true });
  const captures = re.exec(path);

  if (false) {
    console.log({ path, pattern, re, captures });
  }

  return captures ? captures.slice(1) : null;
}
