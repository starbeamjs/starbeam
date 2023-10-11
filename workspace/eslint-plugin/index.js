// eslint-disable-next-line unused-imports/no-unused-vars
const { ESLint } = require("eslint");

const base = require("./src/base.js");
const tight = require("./src/tight.js");
const typedJS = require("./src/typed-js.js");
const demos = require("./src/demos.js");
const commonjs = require("./src/commonjs.js");
const esm = require("./src/esm.js");
const json = require("./src/json.js");
const recommended = require("./src/package.js");

/** @type {ESLint.Plugin} */
module.exports = {
  configs: {
    "library:recommended": recommended.library,
    "tests:recommended": recommended.tests,

    tight: {
      ...base.config,
      extends: [...base.extends, ...tight.extends],
      rules: { ...base.rules, ...tight.rules },
    },
    "typed-js": {
      ...base.config,
      extends: [...base.extends, ...typedJS.extends],
      rules: { ...base.rules, ...typedJS.rules },
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
    esm: {
      ...esm.config,
      extends: esm.extends,
      rules: esm.rules,
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
    "json:recommended": json.recommended,
  },
};
