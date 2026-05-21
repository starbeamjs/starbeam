---
title: Reference
description: Starbeam's public package surface at a glance.
---

This section maps the public Starbeam package surface. It is an overview, not a
complete API reference.

If you are choosing what to install first, start with
[Install Starbeam](/start/install/).

## Starter and app-facing packages

- `@starbeam/collections`: reactive `Map`, `Set`, array, and object helpers for
  collection-shaped and object-shaped root state. Start with
  [Collections and objects](/concepts/collections/).
- `@starbeam/universal`: framework-neutral lifecycle APIs such as `Resource`,
  plus compatibility exports for lower-level primitives.
- Framework adapters: `@starbeam/react`, `@starbeam/preact`, `@starbeam/vue`, and
  `@starbeam/svelte` connect reactive reads and resources to each framework.

## Lifecycle and composition packages

- `@starbeam/resource`: resource APIs for reusable setup, sync, and cleanup
  abstractions. App code often reaches resources through `@starbeam/universal`
  or a framework adapter first. Start with
  [Resources and lifecycle](/concepts/lifecycle/) for the app-author model.
- `@starbeam/service`: app-lifetime resource composition. Use it for shared
  state that should live with the app or framework root. App authors usually
  reach services through framework adapter helpers.

## Lower-level and compatibility packages

- `@starbeam/reactive`: lower-level primitives for authors building reactive
  storage or integration primitives. Most app and library models should start
  with `@starbeam/collections` and `@starbeam/universal`.
- `@starbeam/core`: deprecated compatibility alias for `@starbeam/universal`.
  Existing code can keep using it during the compatibility window; new code
  should not start there. See
  [Core compatibility](/reference/core-compatibility/) for migration notes.
