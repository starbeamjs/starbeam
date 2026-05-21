---
title: Reference
description: Starbeam's public package and adapter surface at a glance.
---

This section maps the public Starbeam package and adapter surface. These pages
are hand-written reference cards, not a generated API encyclopedia.

If you are choosing what to install first, start with
[Install Starbeam](/start/install/).

## Starter and app-facing packages

- `@starbeam/collections`: reactive `Map`, `Set`, array, and object helpers for
  collection-shaped and object-shaped root state. Start with
  [Collections](/reference/collections/) or the
  [Collections and objects](/concepts/collections/) concept guide.
- `@starbeam/universal`: framework-neutral lifecycle APIs such as `Resource`,
  plus compatibility exports for lower-level primitives. See
  [Universal APIs](/reference/universal/).
- Framework adapters: `@starbeam/react`, `@starbeam/preact`, `@starbeam/vue`, and
  `@starbeam/svelte` connect Starbeam to framework rendering and lifecycle. The
  Svelte adapter is a current experimental slice with reads and element resources
  but no component-resource or service helpers yet. See
  [Framework adapters](/reference/framework-adapters/).

## Lifecycle and composition packages

- `@starbeam/resource`: resource APIs for reusable setup, sync, and cleanup
  abstractions. App code often reaches resources through `@starbeam/universal`
  or a framework adapter first. Start with
  [Resources](/reference/resources/) or
  [Resources and lifecycle](/concepts/lifecycle/) for the app-author model.
- `@starbeam/service`: app-lifetime resource composition. Use it for shared
  state that should live with the app or framework root. App authors usually
  reach services through framework adapter helpers. Start with
  [Services](/reference/services/) or
  [Services and app lifetime](/concepts/services/).

## Lower-level and compatibility packages

- `@starbeam/reactive`: lower-level primitives for authors building reactive
  storage or integration primitives. Most app and library models should start
  with `@starbeam/collections` and `@starbeam/universal`. See
  [Reactive primitives](/reference/reactive-primitives/).
- `@starbeam/use-strict-lifecycle`: public React lifecycle infrastructure for
  library and adapter authors. App code should start with `@starbeam/react`.
- `@starbeam/core`: deprecated compatibility alias for `@starbeam/universal`.
  Existing code can keep using it during the compatibility window; new code
  should not start there. See
  [Core compatibility](/reference/core-compatibility/) for migration notes.
