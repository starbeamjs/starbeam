// eslint-disable-next-line unused-imports/no-unused-vars
const { ESLint, Linter } = require("eslint");

const base = require("./src/base.js");
const tight = require("./src/tight.js");
const demos = require("./src/demos.js");
const commonjs = require("./src/commonjs.js");
const json = require("./src/json.js");

/** @type {ESLint.Plugin} */
module.exports = {
  configs: {
    tight: {
      ...base.config,
      extends: [...base.extends, ...tight.extends],
      rules: { ...base.rules, ...tight.rules },
    },
    loose: {
      ...base.config,
      extends: base.extends,
      rules: base.rules,
    },
    commonjs: {
      ...commonjs.config,
      extends: commonjs.extends,
      rules: commonjs.rules,
    },
    demos: {
      ...base.config,
      extends: [...base.extends, ...tight.extends],
      rules: { ...base.rules, ...demos.rules },
    },
    "json:package": json["package.json"],
    "json:eslintrc": json[".eslintrc.json"],
    "json:vscode-settings": json[".vscode/settings.json"],
    "json:tsconfig": json["tsconfig.json"],
    "json:default": json["json:default"],
    "jsonc:default": json["jsonc:default"],
    "json:parser": json.parser,
  },
};
