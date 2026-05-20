# @starbeam/reactive

Primitive reactive values for authors building Starbeam primitives, adapters, and
integration layers.

Most app and library models should not start here. They usually want:

- `@starbeam/collections` for reactive objects, arrays, maps, and sets;
- `@starbeam/universal` for framework-neutral resources and common authoring
  APIs;
- a framework adapter such as `@starbeam/react`, `@starbeam/preact`,
  `@starbeam/vue`, or `@starbeam/svelte` when a framework owns rendering.

Use `@starbeam/reactive` directly when you are building a lower-level abstraction
that needs to define reactive storage, expose a primitive reactive value, or
bridge Starbeam into another runtime.

## Package status

This package is public, but its public audience is narrow. The app-facing model
is objects, collections, resources, and domain-shaped values. This package is for
the lower-level pieces those APIs are built from.

The primitive-building surface is:

| Export                                              | Role                                                         |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `Cell`                                              | stores one reactive value inside a primitive                 |
| `Marker`                                            | marks external storage as reactive without storing the value |
| `Formula`                                           | computes a reactive value every time it is read              |
| `CachedFormula`                                     | caches a reactive computation until one of its reads changes |
| `Static`                                            | wraps a non-changing value as reactive                       |
| `read`                                              | reads either a reactive value or a plain value               |
| `CellOptions`, `Equality`, `FormulaFn`, `ReadValue` | helper types for primitive authors                           |

The package also exports tracking-frame, runtime registration, protocol, and
debug helpers. Those exports remain available for adapters and Starbeam internals
that currently depend on them. They are not the primitive-building path this
README teaches.

## Runtime requirement

The primitives in this package need a Starbeam runtime. Most users get that
through `@starbeam/universal`, `@starbeam/collections`, `@starbeam/resource`, or
a framework adapter.

If you import `@starbeam/reactive` directly inside infrastructure code, make sure
that code runs in an environment where Starbeam's runtime has been registered.
Do not teach application code to call runtime registration APIs directly.

## Cell: private storage inside a primitive

A `Cell` stores one value and invalidates its readers when the value changes. Use
it inside a primitive or low-level abstraction, not as the default shape for app
state.

```ts
import { Cell } from "@starbeam/reactive";

export interface Box<T> {
  readonly current: T;
  set(value: T): void;
}

export function Box<T>(initial: T): Box<T> {
  const value = Cell(initial);

  return {
    get current(): T {
      return value.current;
    },

    set(next: T): void {
      value.current = next;
    },
  };
}
```

The public value is `box.current`. The `Cell` is an implementation detail.

For ordinary app state, prefer an object-shaped value such as
`reactive.object({ current: ... })` from `@starbeam/collections`.

### Equality

`Cell` uses `Object.is` by default. Pass an `equals` option when the primitive
needs different equality semantics.

```ts
import { Cell } from "@starbeam/reactive";

const point = Cell(
  { x: 0, y: 0 },
  {
    equals: (left, right) => left.x === right.x && left.y === right.y,
  },
);
```

## Marker: reactive external storage

Use a `Marker` when the value lives somewhere else and your primitive only needs
to mark reads and writes.

```ts
import { Marker } from "@starbeam/reactive";

export class SelectionSet<T> {
  #values = new Set<T>();
  #membership = Marker("SelectionSet membership");

  has(value: T): boolean {
    this.#membership.read();
    return this.#values.has(value);
  }

  add(value: T): void {
    const size = this.#values.size;
    this.#values.add(value);

    if (this.#values.size !== size) {
      this.#membership.mark();
    }
  }

  delete(value: T): void {
    if (this.#values.delete(value)) {
      this.#membership.mark();
    }
  }
}
```

The `Set` owns the data. The `Marker` makes membership reads reactive. Reactive
collections use this idea internally with more granular markers.

## Formula and CachedFormula

Use `Formula` when a bridge should recompute every time it is read. This is a
good fit for mixed-reactive boundaries where the callback may read Starbeam state
and host-framework state.

Use `CachedFormula` when the computation only depends on Starbeam reactive reads
and should reuse its previous value until one of those reads changes.

```ts
import { CachedFormula, Cell, Formula } from "@starbeam/reactive";

export function Multiplier(initial: number) {
  const value = Cell(initial);

  const doubled = CachedFormula(() => value.current * 2);

  return {
    get current(): number {
      return value.current;
    },

    set current(next: number) {
      value.current = next;
    },

    get doubled(): number {
      return doubled.current;
    },

    bridge(readHostMultiplier: () => number) {
      return Formula(() => value.current * readHostMultiplier());
    },
  };
}
```

The cached read is pure Starbeam. The bridge read is intentionally not cached by
Starbeam because the host callback may read state outside Starbeam.

## Static and read

Use `Static` to present a fixed value as reactive. Use `read` when a helper
accepts either a plain value or a reactive value.

```ts
import { read, Static } from "@starbeam/reactive";

const fallback = Static("Untitled");

read(fallback).trim();
read("Custom title").trim();
```

## Compatibility and implementor exports

These exports are still part of the package because Starbeam adapters, runtime
packages, and debug setup use them today:

- tracking frames: `StartTrackingFrame`, `startFrame`, `finishFrame`, and related
  frame types;
- runtime and debug registration: `defineRuntime`, `defineDebug`, `DEBUG`, and
  `UNKNOWN_REACTIVE_VALUE`;
- protocol helpers: `isReactive`, `isTagged`, `intoReactive`, `isFormulaFn`, and
  related types.

They are compatibility and implementor APIs. They may move behind clearer
runtime, protocol, or debug package boundaries in a later PER.

## Learn more

- [Collections and objects](https://starbeamjs.com/concepts/collections/): the
  app-facing root-state model.
- [Resources and lifecycle](https://starbeamjs.com/concepts/lifecycle/): setup,
  sync, and cleanup for work with a lifetime.
- [Reference](https://starbeamjs.com/reference/overview/): package-surface map.
