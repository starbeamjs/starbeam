// @ts-check

const { pwd } = require("shelljs");
const shell = require("shelljs");
const path = require("path");

let root = __dirname;

let packages = String(
  shell.exec("pnpm m ls --depth -1 --porcelain", { silent: true })
)
  .split("\n")
  .filter((file) => file !== "" && file !== root)
  .filter((file) => file.startsWith("@starbeam"))
  .map((p) => path.relative(root, p));

module.exports = /** @type {import("eslint").Linter.Config} */ ({
  root: true,
  parser: "@typescript-eslint/parser",
  ignorePatterns: ["jest/**"],
  parserOptions: {
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  overrides: [
    ...packages.map((p) => pkg(p)),
    {
      files: "./guides/**/*.ts",
      extends: [
        // "plugin:import/recommended",
        // "plugin:import/typescript",
        // "plugin:@typescript-eslint/recommended",
      ],
      rules: {
        "no-inner-declarations": "off",
      },
    },
  ],
});

/**
 * @param {string} dir
 * @returns {import("eslint").Linter.ConfigOverride}
 */
function pkg(dir) {
  /** @type {import("eslint").Linter.ConfigOverride} */
  const pkg = {
    files: path.join(".", dir, "**/*.ts"),
    excludedFiles: [
      path.join(".", dir, "node_modules/**"),
      path.join(".", dir, "**/*.d.ts"),
    ],
    extends: [
      "eslint:recommended",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "plugin:@typescript-eslint/recommended",
    ],
    rules: {
      "prefer-const": "off",
      "no-unused-vars": "off",
      "no-empty": "warn",
      "import/no-cycle": "warn",
      "import/no-self-import": "error",
      "import/no-restricted-paths": [
        "error",
        {
          zones: packages
            .filter((p) => p !== dir)
            .map((p) => restricted(dir, p)),
        },
      ],
      "import/no-extraneous-dependencies": [
        "error",
        {
          packageDir: [path.join(__dirname, dir)],
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-explicit-any": [
        "error",
        {
          ignoreRestArgs: true,
          fixToUnknown: true,
        },
      ],
    },
  };

  console.log(require("util").inspect(pkg, { depth: null, colors: true }));
  return pkg;
}

/**
 * @param {string} source
 * @param {string} restricted
 */
function restricted(source, restricted) {
  let message =
    restricted.startsWith("@starbeam") && source.startsWith("@starbeam")
      ? `Import files from ${restricted} through its package`
      : `Don't import files from ${restricted} from @starbeam pacakges`;

  return {
    target: source,
    from: restricted,
    message: `Import files from ${restricted} through its package`,
  };
}
