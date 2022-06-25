# How To Contribute

## Installation

* Fork the repo at https://github.com/starbeamjs/starbeam/fork
* `git clone <your repo URL>`
* `cd starbeam`
* `pnpm install`

## Linting

* `pnpm lint`
* `pnpm lint --fix`

## Running tests

* `pnpm test` -- Runs cli-based node tests
* `pnpm test:prod` -- Runs cli-based node tests in production mode

## Checking type correctness

* `pnpm typecheck`

## Building the packages

* `pnpm build` -- uses rollup to build out every package
