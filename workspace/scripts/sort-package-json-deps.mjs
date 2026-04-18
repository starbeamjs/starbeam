#!/usr/bin/env node
// Sort dependency keys in every workspace package.json using natural-compare.
//
// `pnpm install` rewrites package.json files using an ASCII-like comparator.
// Our eslint config uses jsonc/sort-keys with natural: true, which calls
// natural-compare. These two disagree on @scope-ext/name vs @scope/name
// ordering (specifically - vs /), so a clean pnpm install can break
// test:workspace:lint.
//
// Run `pnpm sort-deps` after a pnpm install/update if lint reports
// jsonc/sort-keys errors in package.json dependency blocks.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// Inlined from natural-compare-lite (MIT, Lauri Rooden). Matches the
// comparator used by eslint's jsonc/sort-keys rule with `natural: true`.
function naturalCompare(a, b) {
  let i, codeA, codeB = 1, posA = 0, posB = 0;
  function getCode(str, pos, code) {
    if (code) {
      for (i = pos; (code = getCode(str, i)), code < 76 && code > 65; ) ++i;
      return +str.slice(pos - 1, i);
    }
    code = str.charCodeAt(pos) || 0;
    if (code < 45 || code > 127) return code;
    if (code < 46) return 65;
    if (code < 48) return code - 1;
    if (code < 58) return code + 18;
    if (code < 65) return code - 11;
    if (code < 91) return code + 11;
    if (code < 97) return code - 37;
    if (code < 123) return code + 5;
    return code - 63;
  }
  if ((a += "") !== (b += "")) {
    for (; codeB; ) {
      codeA = getCode(a, posA++);
      codeB = getCode(b, posB++);
      if (codeA < 76 && codeB < 76 && codeA > 66 && codeB > 66) {
        codeA = getCode(a, posA, posA);
        codeB = getCode(b, posB, (posA = i));
        posB = i;
      }
      if (codeA !== codeB) return codeA < codeB ? -1 : 1;
    }
  }
  return 0;
}

const paths = execSync(
  'find . -name package.json -not -path "*/node_modules/*" -not -path "*/dist/*"',
  { encoding: "utf8" },
).trim().split("\n");

let fixed = 0;
for (const p of paths) {
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    let changed = false;
    for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
      if (!j[section]) continue;
      const keys = Object.keys(j[section]);
      const sorted = [...keys].sort(naturalCompare);
      if (JSON.stringify(keys) !== JSON.stringify(sorted)) {
        j[section] = Object.fromEntries(sorted.map((k) => [k, j[section][k]]));
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
      console.log("sorted", p);
      fixed++;
    }
  } catch {}
}
console.log("\n" + fixed + " file(s) re-sorted.");
