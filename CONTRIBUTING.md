# How To Contribute

## Questions?

Feel free to ask your questions in any of these places:

- [GitHub Discussions](https://github.com/starbeamjs/starbeam/discussions)
- [Discord](https://discord.gg/HXq3PMmj8A)

## Installation

- Fork the repo at https://github.com/starbeamjs/starbeam/fork
- `git clone <your repo URL>`
- `cd starbeam`
- `pnpm install`

## Linting

- `pnpm check:lint`
- `pnpm check:lint --fix`

## Running demos

At the root of this monorepo, the `pnpm demo` script can be used to start the various demos.

- `pnpm demo jsnation`
- `pnpm demo react`
- `pnpm demo react-store`

## Running tests

- `pnpm test` -- Runs cli-based node tests
- `pnpm test:prod` -- Runs cli-based node tests in production mode

## Checking correctness

- `pnpm check:types`
- `pnpm check:lint`

## Checking for unused dependencies

- `pnpm check:unused`

## Building the packages

- `pnpm build` -- uses rollup to build out every package

## Development utilities

These are aliased via `pnpm dev` at the monorepo root and is an alias for for the scripts located at `<repo-root>/scripts/*`.

Common monorepo tasks can be added to `<repo-root>/scripts/*` and then invoke with `pnpm dev <command name>`

## The `starbeam` key in `package.json`

The tooling in this repository is driven by a number of keys in `package.json` under the `starbeam`
namespace.

Keys can be nested inside of the `starbeam` key, or they can be at the top level of the
`package.json` as `"starbeam:<key>"`.

### `type`

The `type` field is used to determine which type of package this is. Among other things, it is used
to drive the templating facility (`pnpm dev template`) The following types are supported:

- `library` - A library package
- `demo:react` - A demo package
- `interfaces` - A package containing interfaces that are shared between packages but don't contain
  any code that would need to be imported at runtime.
- `support:build` - A package that contains build support code. It should only be used as a dev
  dependency of packages in the workspace.
- `support:tests` - A package that contains test support code. It should only be used as a dev
  dependency of test packages in the workspace.
- `draft` - A package that doesn't "work" yet and therefore shouldn't have any transformations,
  tests or checks applied to it. It should also not be cleaned up.
- `root` - The root of the workspace.
- `unknown` - The default type. This is used for packages that don't have a `starbeam:type` field in
  their `package.json` file. This is purely for completeness. Do not check in packages with this
  type.
- `none` - This is used to indicate that a package should not be processed by the monorepo tooling.

### `source`

The `source` field is used to determine which files in the directory should be treated as input
files.

When a file is treated as an input file:

- the `pnpm dev unused` facility searches them for dependency uses

When a file is **not** treated as an input file:

- the `pnpm dev clean` facility might delete it if it matches an output pattern (such as `.d.ts`,
  see below)

The following table shows the files that are treated as input files for each type of package:

| Source type   | `.ts` | `.tsx` | `.js` | `.jsx` | `.d.ts` |
| ------------- | ----- | ------ | ----- | ------ | ------- |
| `ts`          | ✅    | ❌     | ❌    | ❌     | ❌      |
| `tsx`         | ✅    | ✅     | ❌    | ❌     | ❌      |
| `js:untyped`  | ❌    | ❌     | ✅    | ❌     | ❌      |
| `js:typed`    | ❌    | ❌     | ✅    | ❌     | ✅      |
| `jsx:untyped` | ❌    | ❌     | ✅    | ✅     | ❌      |
| `jsx:typed`   | ❌    | ❌     | ✅    | ✅     | ✅      |
| `d.ts`        | ❌    | ❌     | ❌    | ❌     | ✅      |

### `inline`

A list of packages that should be inlined into this package when built.

### `jsx`

The `jsx` field is used to determine which JSX factory should be used when building this package.

The tooling only supports the automatic runtime, so only a single value is necessary.

### `used`

A list of packages that are used by this package, but not otherwise identified by the `pnpm dev unused` tooling.

Each entry in the list should be in the format:

```json
{
  "reason": "The reason why this package is used",
  "packages": ["<name>"]
}
```

For example:

```json
{
  "starbeam:unused": [{ "reason": "tests", "packages": ["vitest"] }]
}
```
