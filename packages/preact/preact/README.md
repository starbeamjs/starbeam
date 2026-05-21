# @starbeam/preact

Preact adapter for Starbeam reactive reads, resources, services, and
DOM element resources.

Preact render is the main output boundary. After you install the adapter into
Preact `options`, components can read Starbeam-backed JavaScript directly during
render. Starbeam tracks those render reads and asks Preact to rerender the
component when they change.

## Install

```sh
pnpm add @starbeam/preact @starbeam/universal @starbeam/collections
```

## Install the adapter

Install Starbeam into Preact before rendering your app.

```tsx
import { install } from "@starbeam/preact";
import { options, render } from "preact";

import { App } from "./app.js";

install(options);

render(<App />, document.getElementById("root")!);
```

There is no Starbeam provider component for Preact. `install(options)` connects
Starbeam to Preact's render and lifecycle hooks.

## Read Starbeam state during render

Keep the model ordinary JavaScript. Mark the storage that changes with
`@starbeam/collections`, then expose domain-shaped getters and methods.

```ts
import { reactive } from "@starbeam/collections";

interface LineItem {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
  readonly quantity: number;
}

export class Cart {
  #items = reactive.Map<string, LineItem>();

  get itemCount(): number {
    return [...this.#items.values()].reduce(
      (total, item) => total + item.quantity,
      0,
    );
  }

  get totalCents(): number {
    return [...this.#items.values()].reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );
  }

  add(item: LineItem): void {
    this.#items.set(item.id, item);
  }
}
```

Read the model directly from Preact render.

```tsx
import type { VNode } from "preact";

import { Cart } from "./cart.js";

const cart = new Cart();

export function CartSummary(): VNode {
  return (
    <section>
      <p>{cart.itemCount} items</p>
      <p>${(cart.totalCents / 100).toFixed(2)}</p>

      <button
        type="button"
        onClick={() =>
          cart.add({
            id: crypto.randomUUID(),
            name: "Tea",
            priceCents: 500,
            quantity: 1,
          })
        }
      >
        Add tea
      </button>
    </section>
  );
}
```

You do not list the Starbeam data the component reads. The installed adapter
tracks the render.

`useReactive()` is public for explicit reactive values, but it is not the main
Preact path. In Preact, direct render reads are the default boundary.

## Resources

Use `useResource()` when state needs setup, sync, or cleanup. The resource gets a
Preact component lifetime, and render can read the returned value directly.

```tsx
import { useResource } from "@starbeam/preact";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

const Clock = Resource(({ on }) => {
  const clock = reactive.object({ now: new Date() });

  on.sync(() => {
    clock.now = new Date();

    const timer = setInterval(() => {
      clock.now = new Date();
    }, 1000);

    return () => clearInterval(timer);
  });

  return clock;
});

export function ClockLabel() {
  const clock = useResource(Clock);

  return <time>{clock.now.toLocaleTimeString()}</time>;
}
```

`useResource()` accepts optional Preact dependencies when the resource blueprint
captures changing Preact values. Starbeam reactive reads inside the resource do
not need to be listed manually.

## Element resources

Use `useElementResource()` when a resource needs a DOM element from Preact. It
returns a callback ref and either a pending or attached value.

```tsx
import { useElementResource } from "@starbeam/preact";

import { ElementSize } from "./element-size.js";

export function MeasuredPanel() {
  const size = useElementResource((element: HTMLElement) =>
    ElementSize(element),
  );

  const label =
    size.status === "pending"
      ? "Measuring…"
      : `${Math.round(size.current.width)} × ${Math.round(size.current.height)}`;

  return <section ref={size.ref}>{label}</section>;
}
```

`ElementSize` can be the same framework-neutral `Resource` plus
`reactive.object()` shape shown in the full Preact guide.

The DOM element comes from Preact. The resource work lives in Starbeam and is
finalized when Preact detaches the element resource.

## Services

Use `useService()` for shared resource-backed state under the installed Preact
root. Services are for app-level concerns whose lifetime should follow the Preact
app.

```tsx
import { useService } from "@starbeam/preact";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

const SessionService = Resource(() => {
  return reactive.object({ userName: "Guest" });
});

export function CurrentUser() {
  const session = useService(SessionService);

  return <p>{session.userName}</p>;
}
```

## Lower-level APIs

These APIs are public, but they are not the main Preact path:

- `useReactive()` for explicit reactive values;
- `setup()`, `setupReactive()`, `setupResource()`, `setupService()`, and
  `setupSync()` for lower-level integrations;
- `createCell()` for adapter-level reactive cells;
- `ElementResource` and `ElementResourceBlueprint` for element-resource wrappers.

Start with direct render reads, `useResource()`, `useElementResource()`, and
`useService()`.

## Learn more

- [Preact guide](https://starbeamjs.com/frameworks/preact/): full walkthrough.
- [Install Starbeam](https://starbeamjs.com/start/install/): package chooser.
- [Core concepts](https://starbeamjs.com/concepts/overview/): framework-neutral
  model.
- [Reference](https://starbeamjs.com/reference/overview/): package surface map.
