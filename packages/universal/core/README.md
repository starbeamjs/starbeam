# @starbeam/core

`@starbeam/core` is a deprecated compatibility alias for `@starbeam/universal`.

Do not start new code with `@starbeam/core`. New framework-neutral Starbeam code
should use `@starbeam/universal`, plus `@starbeam/collections` when state is
object-shaped or collection-shaped.

## Why this package exists

Older Starbeam code imported framework-neutral APIs from `@starbeam/core`. The
current package name for that surface is `@starbeam/universal`.

`@starbeam/core` remains published during the compatibility window so existing
projects can keep installing while they migrate. Importing the compatibility
package emits a warning and re-exports `@starbeam/universal`.

## Migrate to `@starbeam/universal`

1. Add `@starbeam/universal` to your dependencies.
2. Change imports that point at `@starbeam/core` so they point at
   `@starbeam/universal`.
3. Remove `@starbeam/core` once no imports use it.

There is no separate `@starbeam/core` API story. For the compatibility surface,
the migration is a package rename.

## Learn more

- [Core compatibility](https://starbeamjs.com/reference/core-compatibility/):
  migration notes for existing users.
- [Install Starbeam](https://starbeamjs.com/start/install/): choose packages for
  new code.
- [Reference](https://starbeamjs.com/reference/overview/): current public package
  surface.
