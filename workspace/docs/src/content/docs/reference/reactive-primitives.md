---
title: Reactive primitives
description: "Reference for @starbeam/reactive primitive-building APIs."
---

`@starbeam/reactive` exposes primitive reactive values for authors building
Starbeam primitives, adapters, and integration layers. It is not the normal
starting point for app state.

Most app and library models should start with `@starbeam/collections`,
`@starbeam/universal`, or a framework adapter.

## Install

```sh
pnpm add @starbeam/reactive
```

## Primitive-building surface

| Export                                              | Use for                                                      |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `Cell`                                              | Store one reactive value inside a primitive.                 |
| `Marker`                                            | Mark external storage as reactive without storing the value. |
| `Formula`                                           | Compute a reactive value every time it is read.              |
| `CachedFormula`                                     | Cache a reactive computation until one of its reads changes. |
| `Static`                                            | Wrap a non-changing value as reactive.                       |
| `read`                                              | Read either a reactive value or a plain value.               |
| `CellOptions`, `Equality`, `FormulaFn`, `ReadValue` | Helper types for primitive authors.                          |

Use these APIs when the public value you are building is itself a reactive
primitive or low-level abstraction. For ordinary app state, prefer reactive
objects and collections.

## Compatibility and implementor exports

`@starbeam/reactive` also exports lower-level APIs used by Starbeam adapters,
runtime packages, and debug setup:

- tracking frames such as `StartTrackingFrame`, `startFrame`, and `finishFrame`;
- runtime and debug registration such as `defineRuntime`, `defineDebug`, `DEBUG`,
  and `UNKNOWN_REACTIVE_VALUE`;
- protocol helpers such as `isReactive`, `isTagged`, `intoReactive`, and
  `isFormulaFn`.

These remain exported for compatibility. They are not the app-facing primitive
path.

## Related docs

- [Reactive README](https://github.com/starbeamjs/starbeam/tree/main/packages/universal/reactive)
- [Collections and objects](/concepts/collections/)
- [Universal APIs](/reference/universal/)
