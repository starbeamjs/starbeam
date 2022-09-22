# How To Contribute

## Questions?

Feel free to ask your questions in any of these places:

* [GitHub Discussions](https://github.com/starbeamjs/starbeam/discussions)
* [Discord](https://discord.gg/HXq3PMmj8A)

## Installation

* Fork the repo at https://github.com/starbeamjs/starbeam/fork
* `git clone <your repo URL>`
* `cd starbeam`
* `pnpm install`

## Linting

* `pnpm check:lint`
* `pnpm check:lint --fix`

## Running demos

At the root of this monorepo, the `pnpm demo` script can be used to start the various demos.

* `pnpm demo jsnation`
* `pnpm demo react`
* `pnpm demo react-store`

## Running tests

* `pnpm test` -- Runs cli-based node tests
* `pnpm test:prod` -- Runs cli-based node tests in production mode

## Checking correctness

* `pnpm check:types`
* `pnpm check:lint`

## Checking for unused dependencies

* `pnpm check:unused`

## Building the packages

* `pnpm build` -- uses rollup to build out every package

## Development utilities

These are aliased via `pnpm dev` at the monorepo root and is an alias for for the scripts located at `<repo-root>/scripts/*`.

Common monorepo tasks can be added to `<repo-root>/scripts/*` and then invoke with `pnpm dev <command name>`
