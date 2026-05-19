---
title: Reference
description: Starbeam's public package surface at a glance.
---

This section maps the public Starbeam package surface. It is an overview, not a
complete API reference.

## Starter and app-facing packages

- `@starbeam/collections`: reactive `Map`, `Set`, array, and object helpers for
  collection-shaped root state.
- `@starbeam/universal`: framework-neutral scalar state and lifecycle APIs such
  as `Cell` and `Resource`.
- Framework adapters: `@starbeam/react`, `@starbeam/preact`, `@starbeam/vue`, and
  `@starbeam/svelte` connect reactive reads and resources to each framework.

## Lifecycle and composition packages

- `@starbeam/resource`: resource APIs for reusable setup, sync, and cleanup
  abstractions. App code often reaches resources through `@starbeam/universal`
  or a framework adapter first. Start with
  [Resources and lifecycle](/concepts/lifecycle/) for the app-author model.
- `@starbeam/service`: app-lifetime resource composition. Use it for shared
  state that should live with the app or framework root.

## Lower-level and compatibility packages

- `@starbeam/reactive`: primitive reactive values such as `Cell`, `Marker`,
  `Formula`, and `CachedFormula`. It is public for library authors, but most app
  code should start with `@starbeam/collections` and `@starbeam/universal`.
- `@starbeam/core`: deprecated compatibility alias for `@starbeam/universal`.
  Existing code can keep using it during the compatibility window; new code
  should not start there.
