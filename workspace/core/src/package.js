import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_EXTERNAL_OPTIONS } from "./constants.js";
import { getPackageMeta } from "./package-meta.js";
import { parseJSON } from "./utils.js";

/**
 * @typedef {import("./manifest.js").PackageJSON} PackageJSON
 * @typedef {import("./manifest.js").InlineRules} PackageJsonInline
 * @typedef {import("./types.js").ExternalOption} ExternalOption
 * @typedef {import("./types.js").PackageInfo} PackageInfo
 */

/**
 * @implements {PackageInfo}
 */
export class Package {
  /**
   * @param {ImportMeta | string} meta
   * @returns {Package | undefined}
   */
  static at(meta) {
    return buildPackage(meta);
  }

  /** @readonly @type {PackageInfo} */
  #package;

  /***
   * @param {PackageInfo} pkg
   */
  constructor(pkg) {
    this.#package = pkg;
  }

  get name() {
    return this.#package.name;
  }

  get main() {
    return this.#package.main;
  }

  get root() {
    return this.#package.root;
  }

  get starbeam() {
    return this.#package.starbeam;
  }
}

/**
 * @param {ImportMeta} meta
 * @returns {string}
 */
export function rootAt(meta) {
  return new URL(".", meta.url).pathname;
}

/**
 * @param {PackageJsonInline} inline
 * @returns {ExternalOption}
 */
function mapExternal(inline) {
  if (typeof inline === "string") {
    return { [inline]: "inline" };
  } else {
    return [inline[0], { [inline[1]]: "inline" }];
  }
}

/**
 * @param {ImportMeta | string} meta
 * @returns {Package | undefined}
 */
function buildPackage(meta) {
  const root = typeof meta === "string" ? meta : rootAt(meta);

  /** @type {PackageJSON} */
  const json = parseJSON(readFileSync(resolve(root, "package.json"), "utf8"));

  const starbeamExternal = [...DEFAULT_EXTERNAL_OPTIONS];

  if (json["starbeam:inline"]) {
    starbeamExternal.push(...json["starbeam:inline"].map(mapExternal));
  }

  if (json.starbeam?.inline) {
    starbeamExternal.push(...json.starbeam.inline.map(mapExternal));
  }

  const type = getPackageMeta(json, "type", (value) => {
    if (typeof value !== "string") {
      throw new Error(`Invalid starbeam:type: ${JSON.stringify(value)}`);
    }
    return value;
  });

  /** @type {string | undefined} */
  let jsx;

  if (json["starbeam:jsx"]) {
    jsx = json["starbeam:jsx"];
  } else if (json.starbeam?.jsx) {
    jsx = json.starbeam.jsx;
  }

  /** @type {string | undefined} */
  let source;

  if (json["starbeam:source"]) {
    source = json["starbeam:source"];
  } else {
    source = json.starbeam?.source;
  }

  /** @type {Record<string, string> | string | undefined} */
  let rawEntry;

  if (json["starbeam:entry"]) {
    rawEntry = json["starbeam:entry"];
  } else if (json.starbeam?.entry) {
    rawEntry = json.starbeam.entry;
  } else {
    rawEntry = undefined;
  }

  /** @type {Record<string, string>} */
  let entry;

  if (typeof rawEntry === "string") {
    entry = { index: rawEntry };
  } else if (typeof rawEntry === "object") {
    entry = rawEntry;
  } else {
    entry = { index: json.main };
  }

  if (json.main) {
    return new Package({
      name: json.name,
      main: resolve(root, json.main),
      root,
      starbeam: {
        external: starbeamExternal,
        source,
        jsx,
        type,
        entry,
      },
    });
  } else if (
    json["starbeam:type"] === "draft" ||
    json.starbeam?.type === "draft"
  ) {
    // do nothing
  } else {
    // eslint-disable-next-line no-console
    console.warn(`No main entry point found for ${json.name} (in ${root})`);
  }
}
