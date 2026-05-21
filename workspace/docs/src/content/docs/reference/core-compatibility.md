---
title: Migrate from @starbeam/core
description: "Move existing imports from the deprecated @starbeam/core compatibility package to @starbeam/universal."
---

`@starbeam/core` is a deprecated compatibility alias for `@starbeam/universal`.

This page is for existing projects that still depend on `@starbeam/core`. Do not
start new code there. New framework-neutral Starbeam code should use
`@starbeam/universal`, plus `@starbeam/collections` when state is object-shaped
or collection-shaped.

## What changed

Older Starbeam code imported framework-neutral APIs from `@starbeam/core`. The
current package name for that surface is `@starbeam/universal`.

`@starbeam/core` remains available during the compatibility window so existing
projects can migrate without combining an upgrade with an immediate source edit.
Importing it emits a warning and re-exports `@starbeam/universal`.

## Migration steps

1. Add `@starbeam/universal` to your dependencies.
2. Change imports that point at the deprecated compatibility package so they point
   at `@starbeam/universal`.
3. Run your tests and typecheck.
4. Remove `@starbeam/core` from your dependencies once no imports use it.

For the compatibility surface, this is a package rename. There is no separate
`@starbeam/core` API to learn.

## New code

Use current package entry points instead:

- `@starbeam/collections` for reactive versions of ordinary JavaScript objects
  and built-in collections;
- `@starbeam/universal` for framework-neutral resources and common authoring
  APIs;
- a framework adapter when a framework owns rendering.

See [Install Starbeam](/start/install/) for the package chooser and
[Reference](/reference/overview/) for the current package map.
