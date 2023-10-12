const HELPERS = ["@babel/runtime/*", "tslib", "@swc/core"];

/**
 * @param {import("#/types").InlineRules | undefined} rules
 * @param {{package: string}} options
 */
export function normalizeRules(rules, { package: packageName }) {
  /** @type {import("#/types").NormalizedExternalOption[]} */
  const normalized = [];

  if (rules !== undefined) {
    if (Array.isArray(rules)) {
      return rules.flatMap((rule) =>
        normalizeRule(rule, { defaultConfig: "inline", packageName }),
      );
    } else {
      return Object.entries(rules).flatMap(([name, config]) => {
        return normalizeRule(name, { defaultConfig: config, packageName });
      });
    }
  }

  // By default, the built-in helpers are inlined. Add this last so that the
  // user's configuration takes precedence.
  normalized.push(
    ...HELPERS.flatMap((helper) =>
      normalizeLeaf(helper, "inline", packageName),
    ),
  );

  normalized.push(...normalizeLeaf("(scope)", "external", packageName));

  return normalized;
}

/**
 * @param {import("#/types").InlineRule} rule
 * @param {object} options
 * @param {import("#/types").ExternalConfig | undefined} [options.defaultConfig]
 * @param {string} options.packageName
 * @returns {import("#/types").NormalizedExternalOption[]}
 */
function normalizeRule(rule, { defaultConfig = "inline", packageName }) {
  if (typeof rule === "string") {
    return normalizeLeaf(rule, defaultConfig, packageName);
  } else {
    return Object.entries(rule).flatMap(([name, config]) =>
      normalizeLeaf(name, config, packageName),
    );
  }
}

/**
 * @param {string} name
 * @param {import("#/types").ExternalConfig } config
 * @param {string} packageName
 * @returns {import("#/types").NormalizedExternalOption[]}
 */
function normalizeLeaf(name, config, packageName) {
  if (name.endsWith("*")) {
    return [["startsWith", name.slice(0, -1), config]];
  } else if (name === "(helpers)") {
    return HELPERS.flatMap((helper) =>
      normalizeLeaf(helper, config, packageName),
    );
  } else if (name === "(scope)") {
    const scope = /^(@[^/]+\/)/.exec(packageName);
    if (!scope) return [];
    const [_, scopeName] = /** @type {RegExpExecArray & [string, string]} */ (
      scope
    );
    return [["startsWith", scopeName, config]];
  } else {
    return [["is", name, config]];
  }
}
