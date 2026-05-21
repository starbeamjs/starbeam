---
title: Universal APIs
description: "Reference for @starbeam/universal, the framework-neutral Starbeam authoring package."
---

`@starbeam/universal` is the framework-neutral authoring package for Starbeam.
Use it for resources and common reactive authoring APIs that are not tied to a
specific framework adapter.

Most framework-neutral app and library code pairs it with `@starbeam/collections`.

## Install

```sh
pnpm add @starbeam/universal @starbeam/collections
```

## Common imports

```ts
import { Resource } from "@starbeam/universal";
import { reactive } from "@starbeam/collections";
```

## Current public surface

| Export group         | Exports                                                        | Notes                                                                                                |
| -------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Resources            | `Resource`, `ResourceList`                                     | Framework-neutral lifecycle authoring.                                                               |
| Resource types       | `ResourceBlueprint`, `IntoResourceBlueprint`                   | Useful for reusable resource helpers.                                                                |
| Reactive primitives  | `Cell`, `Marker`, `Formula`, `CachedFormula`, `Static`, `read` | Prefer `@starbeam/collections` for app state; use primitives when building lower-level abstractions. |
| Reactive types       | `Reactive`, `Equality`, `FormulaFn`                            | Helper types for library and primitive authors.                                                      |
| Higher-level helpers | `FormulaList`, `Freshness`, `Variants`                         | Advanced reactive helpers.                                                                           |

## Direct packages not re-exported here

Some public APIs intentionally stay in direct packages:

| Package              | Use for                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `@starbeam/service`  | lower-level app-scoped service machinery                         |
| `@starbeam/resource` | low-level resource setup and sync helpers                        |
| `@starbeam/reactive` | primitive-building surface and implementor compatibility exports |

App authors usually reach services and resource scheduling through framework
adapters.

## Compatibility exports

`@starbeam/universal` still exports a few lower-level values for compatibility
with existing packages and integrations. These are not the first APIs to teach in
new examples:

- debug wiring such as `DEBUG` and `DEBUG_RENDERER`;
- runtime/protocol wiring such as `CONTEXT`, `RUNTIME`, and `TAG`.

Prefer direct package imports or adapter APIs for new low-level integration code.

## Related docs

- [Resources and lifecycle](/concepts/lifecycle/)
- [Collections reference](/reference/collections/)
- [Reactive primitives](/reference/reactive-primitives/)
- [Services](/reference/services/)
