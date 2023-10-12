/**
 * @param {string} root
 * @param {import("./package").PackageJSON} packageJSON
 * @param {import("./manifest").StarbeamKey} path
 * @param {(value: unknown) => unknown} map?
 */
export function getPackageMeta(
  root,
  packageJSON,
  path,
  map = (value) => value,
) {
  const inline = packageJSON[`starbeam:${path}`];

  if (inline) {
    return map(inline);
  }

  const starbeam = packageJSON.starbeam;

  if (!starbeam) {
    return map(undefined);
  }

  if (typeof starbeam === "object") {
    const value = starbeam[path];
    return map(value);
  }

  invalidKey(root, starbeam);
}

/**
 * @param {string} root
 * @param {import("#/json").JsonValue} value
 */
function invalidKey(root, value) {
  const message = [`Invalid value for the starbeam key (expected an object`];

  if (Array.isArray(value)) {
    message.push(`, got an array`);
  } else {
    message.push(`, got ${JSON.stringify(value)}`);
  }

  message.push(`) at ${root}`);

  throw Error(message.join(""));
}
