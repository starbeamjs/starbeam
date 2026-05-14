# `@starbeam/universal`

`@starbeam/universal` is the framework-neutral app and library authoring
surface for Starbeam.

Use it for examples and reusable code that are not tied to a specific framework
adapter.

## Canonical imports

Import Starbeam's common authoring primitives from `@starbeam/universal`:

```ts
import {
  CachedFormula,
  Cell,
  Formula,
  Marker,
  read,
  Resource,
  ResourceList,
} from "@starbeam/universal";
```

The canonical app/library surface includes:

- reactive values: `Cell`, `Marker`, `Formula`, `CachedFormula`, `Static`, and
  `read`;
- reactive authoring types: `Reactive`, `Equality`, and `FormulaFn`;
- resource authoring APIs: `Resource`, `ResourceList`, `ResourceBlueprint`, and
  `IntoResourceBlueprint`;
- higher-level reactive helpers currently exported from this package:
  `FormulaList`, `Freshness`, and `Variants`.

## Direct package imports

Some public APIs are intentionally not part of the universal umbrella.

Import low-level resource setup and sync helpers directly from
`@starbeam/resource`:

```ts
import { PrimitiveSyncTo, setupResource, SyncTo } from "@starbeam/resource";
```

Import app-scoped service machinery directly from `@starbeam/service`, or prefer
the framework adapter service APIs when writing app code:

```ts
import { getServiceFormula, service } from "@starbeam/service";
```

`@starbeam/universal` does not re-export service APIs today.

## Compatibility exports

`@starbeam/universal` still exports a few lower-level values for compatibility
with existing packages and integrations. These are not the app/library authoring
surface to teach in new examples:

- debug wiring: `DEBUG`, `DEBUG_RENDERER`;
- runtime/protocol wiring: `CONTEXT`, `RUNTIME`, `TAG`.

Prefer direct package imports or adapter APIs when writing new low-level code.
These compatibility exports may move behind clearer protocol/debug boundaries in
a later Prepare / Execute / Review (PER) cycle.
