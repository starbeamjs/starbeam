/**
 * @template T
 * @param {import("./manifest").PackageJSON} packageJSON
 * @param {import("./manifest").StarbeamKey} path
 * @param {(value: import("./json").JsonValue) => T} [map]
 * @returns {T}
 */
export function getPackageMeta(
  packageJSON,
  path,
  map = (value) => /** @type {T} */ (value),
) {
  const inline = packageJSON[`starbeam:${path}`];

  if (inline) {
    return map(inline);
  }

  const starbeam = packageJSON.starbeam;

  if (starbeam && typeof starbeam === "object" && !Array.isArray(starbeam)) {
    const value = starbeam[path];

    if (value) {
      return map(value);
    }
  }

  throw Error(`missing starbeam:${path}`);
}
