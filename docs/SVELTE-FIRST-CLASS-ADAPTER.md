# Svelte First-Class Adapter

This is the current decision record for making `@starbeam/svelte` a first-class
adapter beyond element-backed resources.

## Status

Accepted for the first implementation slice. PR
[#260](https://github.com/starbeamjs/starbeam/pull/260) adds `fromStarbeam()` as
an experimental Svelte 5 read bridge. Deeper integration work is tracked in
[#261](https://github.com/starbeamjs/starbeam/issues/261).

## Decision summary

Svelte should get a Svelte 5-native Starbeam read boundary before we document a
full framework guide.

`fromStarbeam()` is that first boundary. It is intentionally explicit while we
investigate whether signals interop, userspace Svelte-reactive wrappers, or a
future public Svelte hook can make Starbeam reads visible with fewer explicit
output boundaries.

The first implementation slice proves a single primitive:

```ts
const total = fromStarbeam(() => cart.totalCents);
```

Svelte components would read the value through a getter-like output slot:

```svelte
<p>{total.current}</p>
```

The implementation should use Svelte's `createSubscriber` plus Starbeam's
`Formula` and `RUNTIME.subscribe()`:

1. The Svelte-facing getter calls Svelte's subscriber.
2. The getter reads the Starbeam formula.
3. Starbeam subscribes Svelte's update callback to the formula's dependencies.
4. When Starbeam root state changes, Svelte reruns the template/effect/derived
   that read the getter.

This keeps the Svelte API modern: no Svelte 4 action story, no React-style
dependency arrays, and no store-first primary API.

`fromStarbeam()` is the experimental public name for the first slice. It
describes an external-reactivity conversion and avoids colliding with
`@starbeam/collections`.

## Current state

Before PR #260, `@starbeam/svelte` was an element-resource adapter.

It exposes:

- `elementResource()`;
- `elementResourceStore()`;
- `elementResourceAttachment()`;
- element-resource types.

Those APIs are already modern Svelte 5 APIs. The current implementation and
tests use `{@attach ...}`, `$state`, `$derived`, `$props()`, and `onclick`.
That part does not need a legacy-to-modern rewrite.

The missing public surface is broader:

- ordinary Starbeam reads in Svelte markup;
- component-lifetime resources;
- app-scoped services.

## Goals

- Keep root state JavaScript-shaped.
- Let Svelte components read ordinary domain getters through a Svelte-native
  output boundary.
- Use Svelte 5 primitives, especially `createSubscriber`, runes, and
  attachments.
- Avoid React vocabulary such as hooks, dependency arrays, and bridge tuples.
- Avoid making Svelte stores the primary API.
- Keep existing element-resource APIs intact.

## Non-goals for the first implementation PER

- Full `Resource` support for Svelte component lifetimes.
- App-scoped `Service` support.
- A Svelte framework guide.
- Svelte 4 `use:` action compatibility.
- Store-first public API design.
- Proxying arbitrary objects so `{cart.totalCents}` works without an explicit
  Starbeam/Svelte output boundary.
- Global Starbeam runtime changes.

## Proposed read bridge

The first public API should be small:

```ts
import { fromStarbeam } from "@starbeam/svelte";

const total = fromStarbeam(() => cart.totalCents);
```

A plausible implementation shape is:

```ts
import { Formula } from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";
import { createSubscriber } from "svelte/reactivity";

export function fromStarbeam<T>(compute: () => T): { readonly current: T } {
  const formula = Formula(compute);

  const subscribe = createSubscriber((update) => {
    return RUNTIME.subscribe(formula, update);
  });

  return {
    get current(): T {
      subscribe();
      return formula.current;
    },
  };
}
```

Important choices:

- Use `Formula`, not `CachedFormula`, for the first implementation. A Svelte
  expression may also read Svelte-owned state; `Formula` reruns whenever Svelte
  asks for `.current`.
- The API returns a value object, not a Svelte store. The public read shape is
  closer to Svelte's reactive built-ins, where a getter participates in Svelte
  tracking.
- The first API should not accept a dependency array. Svelte tracks Svelte
  values; Starbeam tracks Starbeam values.

### Why `createSubscriber`

Svelte's `createSubscriber` is designed for external event systems. If the
subscriber is called inside an effect, including indirectly from a getter,
Svelte calls the `start(update)` function and reruns the effect when `update()`
fires. When the last tracking consumer is destroyed, Svelte runs the cleanup
returned from `start()`.

That maps directly to Starbeam:

- the getter calls the Svelte subscriber;
- the getter reads the Starbeam formula;
- `RUNTIME.subscribe(formula, update)` connects Starbeam invalidation to
  Svelte's update callback;
- Svelte owns the lifetime of the subscription.

Reads outside a tracked Svelte context are still valid plain reads. In that
case, the subscriber does not start a Svelte subscription.

### Why `.current`

The `.current` slot is a Svelte-facing output boundary, not a shape that domain
objects should expose. It follows Svelte precedent: Svelte's own reactive values
such as `MediaQuery` expose `current`, and `fromStore()` converts a store into an
object with a reactive `current` property.

The intended domain model remains:

```ts
cart.totalCents;
```

The adapter boundary is the object returned by `fromStarbeam()`:

```svelte
<p>{total.current}</p>
```

### SSR behavior

Svelte's server `createSubscriber` implementation is a no-op. The read bridge
should therefore compute synchronously on the server and establish no runtime
subscription. On the client, reading `.current` inside a tracked Svelte context
should establish the Starbeam subscription.

The first implementation includes an SSR smoke test for this behavior.

## Naming

The first public name is `fromStarbeam()`.

Why:

- It says this API converts Starbeam reads into a Svelte-readable value.
- It matches Svelte conversion vocabulary such as `fromStore()`.
- It avoids React's `useReactive()` hook vocabulary.
- It avoids Vue's `setupReactive()` component-setup vocabulary.
- It avoids the import collision between a generic `reactive()` export and
  `reactive` from `@starbeam/collections`.

Known drawback:

- `fromStarbeam()` is branded and a little longer than the other adapter names.

Alternatives considered:

- `setupReactive()` — more Vue-shaped than Svelte-shaped.
- `useReactive()` — imports React hook expectations and conflicts with Svelte's
  `use:` action vocabulary.
- `reactive()` — short, but too generic and collides with `@starbeam/collections`.
- `starbeam()` — branded but too vague.
- A store-like wrapper — compatible but not the desired Svelte 5 primary story.

## Validation plan for the first implementation PER

Write tests before or alongside the implementation.

### Basic template read

A fixture should:

- create Starbeam root state with `Cell` or `@starbeam/collections`;
- create `const doubled = fromStarbeam(() => count.current * 2)`;
- render `{doubled.current}`;
- mutate the Starbeam state from an `onclick` handler;
- await `tick()`;
- assert that the DOM updates.

### Domain-shaped getter

A fixture should use a class with private reactive storage:

```ts
class Cart {
  #items = reactiveCollections.Map<string, LineItem>();

  get totalCents() {
    return [...this.#items.values()].reduce(/* ... */);
  }
}
```

Where the example imports the collections helper with an alias to avoid
colliding with `reactive()` from `@starbeam/svelte`:

```ts
import { reactive as reactiveCollections } from "@starbeam/collections";
```

The component should render `total.current`, where `total` is the Svelte read
bridge over `cart.totalCents`. The template should not read `.current` from the
private storage.

### Svelte-owned state plus Starbeam state

A fixture should prove the bridge handles both systems:

- a Starbeam cell or collection;
- a Svelte `$state` multiplier or selector;
- `fromStarbeam(() => starbeamValue.current * multiplier)`;
- changes to either source update the DOM.

This test protects the `Formula` choice.

### Dynamic Starbeam dependencies

A fixture should switch between two Starbeam cells based on Svelte state.
After the switch:

- mutating the old cell should not update the DOM;
- mutating the new cell should update the DOM.

This proves Starbeam dependency refresh through `Formula` and
`RUNTIME.subscribe()`.

Also test the zero-Starbeam-dependency case:

```ts
let enabled = $state(false);
const value = fromStarbeam(() => (enabled ? cell.current : "off"));
```

The first render has no Starbeam dependencies. After `enabled` flips to `true`,
the next read should pick up `cell.current`, and later cell changes should update
the DOM. If this fails, the implementation may need a narrow runtime or adapter
change rather than just a docs update.

### Cleanup

A fixture should unmount a component that read a bridged value, mutate the
Starbeam state, and assert that no compute/event fires after unmount.

This proves Svelte's `createSubscriber` lifetime is sufficient.

Also test multiple consumers of the same bridged value:

- two components or effects read the same bridged object;
- unmounting one still leaves the other subscribed;
- after both unmount, later Starbeam invalidations do not call Svelte update.

### Derived consumer

A fixture should read the bridged value from `$derived` or `$derived.by` and
verify that Starbeam invalidation updates the derived value and template.

### SSR smoke test

A fixture should server-render a component that reads a bridged value and assert
that it computes synchronously without starting a client subscription. A client
mount or hydration test should then establish the subscription and update after a
Starbeam mutation.

## Resource roadmap

Do not start with resources. After the read bridge is proven, the resource PER
should answer:

- what public name should create component-lifetime resources;
- how resource setup/sync/finalize maps to Svelte effect lifetime;
- whether the returned resource value should itself be wrapped by `reactive()` or
  whether the resource helper returns a Svelte-readable value;
- how sync scheduling should align with Svelte microtasks.

A possible future shape is:

```ts
const clock = resource(Clock);
<p>{clock.current.now.toLocaleTimeString()}</p>
```

But this is intentionally not part of the first implementation slice.

## Service roadmap

Services need a separate design pass. Open questions:

- What owns the Svelte app lifetime?
- Should the adapter use Svelte context, an explicit provider component, or a
  module-level app object?
- How does the design behave with multiple apps on one page?
- What is the SSR/hydration story?

Do not document service support until those questions have tests.

## Falsification criteria

Return to Prepare if any of these happen:

- `createSubscriber` cannot safely call `RUNTIME.subscribe()` from a getter-backed
  value.
- The bridge updates for first dependencies but leaks old dynamic dependencies.
- The bridge fails when the compute function reads Svelte `$state`.
- Cleanup is not handled by Svelte subscriber lifetime.
- The `.current` output shape feels too foreign in real Svelte component code.
- Naming conflict with `@starbeam/collections` makes examples materially worse.

## Follow-up PERs

1. Settle the public name, then implement and validate the read bridge.
2. Update `@starbeam/svelte` README with the proven read bridge.
3. Design component-lifetime resources.
4. Design app-scoped services.
5. Add the Svelte framework guide and remove the "broader adapter story still
   maturing" caveat from the framework overview.
