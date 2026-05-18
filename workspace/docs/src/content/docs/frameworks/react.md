---
title: React
description: "The React adapter connects Starbeam reads and resources to React rendering and lifecycle."
---

React is the output boundary for a Starbeam model. Your state can stay ordinary
JavaScript: classes, getters, methods, maps, and resources. `useReactive()` is
where React subscribes to the values your render reads.

## Install

Install the React adapter with the framework-neutral Starbeam packages you will
use for root state and resources:

```sh
pnpm add @starbeam/react @starbeam/universal @starbeam/collections
```

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

## Read the model from React

Use `useReactive()` at the React output boundary. The callback can return the
React element for this component. Starbeam tracks the reactive reads that happen
while the callback runs.

```tsx
import { useReactive } from "@starbeam/react";

import type { Cart } from "./cart.js";

interface CartSummaryProps {
  readonly cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps): React.ReactElement {
  return useReactive(
    () => (
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
    ),
    [cart],
  );
}
```

Pass the second argument when the callback closes over React values that can be
replaced on a later render. In this example, `cart` is a prop, so `[cart]` tells
Starbeam to rebuild the reactive read if React gives the component a different
cart.

You do not list the Starbeam data the callback reads. `cart.itemCount` and
`cart.totalCents` are tracked automatically when the callback runs. If the
callback only reads stable module state or Starbeam state, omit the second
argument.

Keep React hooks at the top level of the component, outside the `useReactive()`
callback.

## Add lifecycle with `useResource()`

Use a `Resource` when state needs setup, sync, or cleanup. `useResource()` gives
the resource a React component lifetime, and `useReactive()` reads the resource
value for rendering.

```tsx
import { useReactive, useResource } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";

const Clock = Resource(({ on }) => {
  const now = Cell(new Date());

  on.sync(() => {
    const timer = setInterval(() => {
      now.set(new Date());
    }, 1000);

    return () => clearInterval(timer);
  });

  return {
    get now(): Date {
      return now.current;
    },
  };
});

export function ClockLabel(): React.ReactElement {
  const clock = useResource(Clock);
  const now = useReactive(() => clock.now);

  return <time>{now.toLocaleTimeString()}</time>;
}
```

The resource returns a domain-shaped value. The component reads that value at the
same output boundary as the cart example.

## DOM element resources

Use `useElementResource()` when a resource needs a DOM element from React. It
returns a callback ref plus a pending or attached result.

```tsx
import { useElementResource, useReactive } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";

function ElementSize(element: HTMLElement) {
  return Resource(({ on }) => {
    const width = Cell(0);
    const height = Cell(0);

    on.sync(() => {
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;

        width.set(entry.contentRect.width);
        height.set(entry.contentRect.height);
      });

      observer.observe(element);

      return () => observer.disconnect();
    });

    return {
      get width(): number {
        return width.current;
      },

      get height(): number {
        return height.current;
      },
    };
  });
}

export function MeasuredPanel(): React.ReactElement {
  const size = useElementResource((element: HTMLElement) =>
    ElementSize(element),
  );

  const label = useReactive(() => {
    if (size.status === "pending") {
      return "Measuring…";
    }

    return `${size.current.width} × ${size.current.height}`;
  }, [size]);

  return <section ref={size.ref}>{label}</section>;
}
```

The element comes from React. The resource work still lives in Starbeam.

## App-scoped services

Use `useService()` for resource-backed state that should live for the app root,
not for one component. Wrap the React tree in `Starbeam` so services have an
app-scoped lifetime.

```tsx
import { Starbeam, useReactive, useService } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";
import { createRoot } from "react-dom/client";

const SessionService = Resource(() => {
  const userName = Cell("Guest");

  return {
    get userName(): string {
      return userName.current;
    },
  };
});

createRoot(document.getElementById("root")!).render(
  <Starbeam>
    <CurrentUser />
  </Starbeam>,
);

function CurrentUser(): React.ReactElement {
  const session = useService(SessionService);
  const userName = useReactive(() => session.userName);

  return <p>{userName}</p>;
}
```

## Lower-level APIs

`useSetup()` and `useProp()` are public, but they are not the first APIs to reach
for in app code. Start with `useReactive()` for render reads, `useResource()` for
component-lifetime resources, `useElementResource()` for element-backed
resources, and `useService()` for app-scoped services.

## Next steps

- Read [Core concepts](/concepts/overview/) for the model behind the adapter.
- Read [Reference](/reference/overview/) for the public package surface.
