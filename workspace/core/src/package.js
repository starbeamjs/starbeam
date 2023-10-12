import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeRules } from "./externals.js";
import { getPackageMeta } from "./package-meta.js";
import { parseJSON } from "./utils.js";

/**
 * @typedef {import("#/manifest").PackageJSON} PackageJSON
 * @typedef {import("#/types").InlineRules} InlineRules
 * @typedef {import("#/types").InlineRule} ExternalOption
 * @typedef {import("#/types").PackageInfo} PackageInfo
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
 * @param {ImportMeta | string} meta
 * @returns {string}
 */
export function rootAt(meta) {
  return typeof meta === "string" ? meta : new URL(".", meta.url).pathname;
}

/**
 * @param {ImportMeta | string} meta
 * @returns {Package | undefined}
 */
function buildPackage(meta) {
  const root = typeof meta === "string" ? meta : rootAt(meta);

  /** @type {PackageJSON} */
  const json = parseJSON(readFileSync(resolve(root, "package.json"), "utf8"));

  const name = json.name;

  const inline = getPackageMeta(root, json, "inline", (rules) =>
    normalizeRules(rules, { package: name }),
  );

  const strict = getPackageMeta(
    root,
    json,
    "strict",
    (value) => new StrictSettings(root, value),
  );

  const type = getPackageMeta(root, json, "type", (value) => {
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
        inline,
        strict,
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

/**
 * @typedef {import("#/types").StrictSettings} StrictSettingsInterface
 * @typedef {import("#/manifest").StarbeamValue<"strict">} StrictSettingsJson
 */

/**
 * @implements {StrictSettingsInterface}
 */
class StrictSettings {
  /** @type {StrictSettingsInterface} */
  #expanded;

  /**
   * @param {string} root
   * @param {StrictSettingsJson} original
   */
  constructor(root, original) {
    this.#expanded = expand(root, original);
  }

  get externals() {
    return this.#expanded.externals;
  }
}

/**
 * @param {string} root
 * @param {StrictSettingsJson} strictness
 * @returns {StrictSettingsInterface}
 */
function expand(root, strictness) {
  if (strictness === undefined) {
    return {
      externals: "allow",
    };
  }

  const leftover = new Set(/** @type const */ (["externals"]));

  /** @type {Partial<{ -readonly[key in keyof StrictSettingsInterface]: StrictSettingsInterface[key }>} */
  const result = {};

  const entries =
    /** @type {[keyof StrictSettingsInterface | "all.v1", import("#/types").Strictness][]} */ (
      Object.entries(strictness)
    );

  for (const [key, value] of entries) {
    if (key === "all.v1") {
      for (const key of leftover) {
        result[key] = verifyValue(root, key, value);
      }
      leftover.clear();
    } else {
      leftover.delete(key);

      result[key] = verifyValue(root, key, value);
    }
  }

  for (const key of leftover) {
    result[key] = "allow";
  }

  return /** @type {StrictSettingsInterface} */ (result);
}

/**
 * @param {string} root
 * @param {string} key
 * @param {string} value
 */
function verifyValue(root, key, value) {
  switch (value) {
    case "allow":
    case "warn":
    case "error":
      return value;
    default:
      // eslint-disable-next-line no-console
      console.warn(
        [
          `Invalid value for strictness:${key} (${value}), falling back to "allow".`,
          `Strictness values should be one of "allow", "warn", or "error".`,
          `From: ${root}`,
        ].join("\n\n"),
      );
  }
}
