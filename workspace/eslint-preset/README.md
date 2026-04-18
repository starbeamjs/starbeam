# @starbeam-workspace/eslint-preset

Flat-config ESLint preset for the Starbeam monorepo.

**Vendored from `@starbeam-dev/eslint-plugin@1.1.1` for the ESLint 9 migration.**
Intent is to extract this back to its own repo once stable.

## Changes from upstream

- Flat-config shape (ESLint 9). The old plugin only shipped legacy/eslintrc configs.
- Dropped `eslint-plugin-etc` entirely — upstream is abandoned and does not
  support ESLint 9. The `etc/no-commented-out-code` warning is gone.
- Dropped `eslint-plugin-file-extension-in-import-ts` — Node 22 / TypeScript
  5.7+ support `.ts` import specifiers directly, so the rule is no longer
  pulling its weight.
- `eslint-comments` rules moved from the namespaced
  `eslint-plugin-eslint-comments` to the maintained
  `@eslint-community/eslint-plugin-eslint-comments` (rule ids now carry the
  `@eslint-community/eslint-comments/` prefix).

## Exports

```js
import {
  // Package-level presets (the main entry points for consumers):
  libraryRecommended,
  testsRecommended,

  // Lower-level building blocks:
  base,
  tight,
  loose,
  esm,
  typedJs,
  comments,
  prettier,

  // JSON / JSONC:
  jsonDefault,
  jsonRecommended,
  packageJson,
  tsconfigJson,
  vscodeSettingsJson,

  // File globs:
  files,
} from "@starbeam-workspace/eslint-preset";
```

All exports are functions returning a `FlatConfig[]` array, suitable for
spreading into an `eslint.config.js`.
