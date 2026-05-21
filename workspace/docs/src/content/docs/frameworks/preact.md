---
title: Preact
description: "The Preact adapter connects Starbeam reads and resources to Preact rendering and lifecycle."
---

Preact render is the output boundary for a Starbeam model. Your state can stay
ordinary JavaScript: classes, getters, methods, maps, and resources. The Preact
adapter connects Starbeam reads and resources to Preact rendering and lifecycle.

Install the adapter once into Preact `options`. After that, Preact render is the
output boundary for Starbeam reads.

## Install

Install the Preact adapter with the framework-neutral Starbeam packages you will
use for root state and resources:

```sh
pnpm add @starbeam/preact @starbeam/universal @starbeam/collections
```

## Install the adapter

Install Starbeam into Preact before rendering the app.

```tsx
import { install } from "@starbeam/preact";
import { options, render } from "preact";

import { App } from "./app.js";

install(options);

render(<App />, document.getElementById("root")!);
```

There is no Starbeam provider component for Preact. The adapter hooks into
Preact through `install(options)`, so reads during render are tracked by the
component that rendered them.

## Keep the model ordinary JavaScript

Start by marking the storage that changes. The rest of the model can be normal
domain code.

```ts
import { reactive } from "@starbeam/collections";

interface LineItem {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
  readonly quantity: number;
}

interface ProductInput {
  readonly name: string;
  readonly priceCents: number;
}

export class Cart {
  #items = reactive.Map<string, LineItem>();
  #nextItemId = 1;

  get items(): readonly LineItem[] {
    return [...this.#items.values()];
  }

  get itemCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  get totalCents(): number {
    return this.items.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );
  }

  add(product: ProductInput): void {
    const id = `item-${this.#nextItemId++}`;

    this.#items.set(id, {
      id,
      name: product.name,
      priceCents: product.priceCents,
      quantity: 1,
    });
  }
}
```

`#items` is the reactive root state. `itemCount`, `totalCents`, and `add()` are
ordinary JavaScript above it.

## Read the model during render

After `install(options)`, ordinary Preact render is the output boundary. Read the
Starbeam model directly where the component renders UI, and Starbeam tracks those
reads for that component.

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
        onClick={() => cart.add({ name: "Tea", priceCents: 500 })}
      >
        Add tea
      </button>
    </section>
  );
}
```

You do not list the Starbeam data the component reads. `cart.itemCount` and
`cart.totalCents` are tracked automatically when the component renders.

`useReactive()` also exists for explicit reactive values, but it is not the main
Preact render path. In Preact, the installed adapter can track the whole render.

## Add lifecycle with `useResource()`

Use a `Resource` when state needs setup, sync, or cleanup. `useResource()` gives
the resource a Preact component lifetime. Render can read the resource's returned
value directly.

```tsx
import { useResource } from "@starbeam/preact";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";
import type { VNode } from "preact";

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

export function ClockLabel(): VNode {
  const clock = useResource(Clock);

  return <time>{clock.now.toLocaleTimeString()}</time>;
}
```

`useResource()` also accepts optional dependencies when the resource blueprint
depends on changing Preact values. Preact owns the timing: sync is scheduled
through Preact effects, and cleanup/finalize run when Preact cleans up the
component.

## DOM element resources

Use `useElementResource()` when a resource needs a DOM element from Preact. It
returns a callback ref plus a pending or attached result.
See [Element resources and DOM attachment](/concepts/element-resources/) for the
framework-neutral concept.

```tsx
import { useElementResource } from "@starbeam/preact";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";
import type { VNode } from "preact";

function ElementSize(element: HTMLElement) {
  return Resource(({ on }) => {
    const size = reactive.object({ width: 0, height: 0 });

    on.sync(() => {
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;

        size.width = entry.contentRect.width;
        size.height = entry.contentRect.height;
      });

      observer.observe(element);

      return () => observer.disconnect();
    });

    return size;
  });
}

export function MeasuredPanel(): VNode {
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

The element comes from Preact. The resource work still lives in Starbeam and is
finalized when Preact detaches the element resource.

## App-scoped services

Use `useService()` for shared resource-backed state under the installed Preact
root. Keep services for app-level concerns whose lifetime should follow the
Preact app.
See [Services and app lifetime](/concepts/services/) for the framework-neutral
concept.

```tsx
import { useService } from "@starbeam/preact";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";
import type { VNode } from "preact";

const SessionService = Resource(() => {
  return reactive.object({ userName: "Guest" });
});

export function CurrentUser(): VNode {
  const session = useService(SessionService);

  return <p>{session.userName}</p>;
}
```

## Lower-level APIs

`setup()`, `setupReactive()`, `setupResource()`, `setupService()`, `setupSync()`,
and `createCell()` are public lower-level APIs. `ElementResource` and
`ElementResourceBlueprint` are public types for element-resource wrappers. Start
with render reads for UI, `useResource()` for component-lifetime resources,
`useElementResource()` for element-backed resources, and `useService()` for
shared services.

## Next steps

- [Core concepts](/concepts/overview/): the framework-neutral Starbeam model.
- [Services and app lifetime](/concepts/services/): app-scoped resource-backed
  state.
- [Element resources and DOM attachment](/concepts/element-resources/): resources
  attached to framework-supplied elements.
- [Reference](/reference/overview/): the public package surface at a glance.
