---
title: Mark root state. Keep the rest JavaScript.
description: "Build a first Starbeam model with root state, ordinary JavaScript reads, and a preview of resources."
---

This walkthrough starts with Starbeam's smallest useful idea: mark the storage
that changes, then build the rest of your model with ordinary JavaScript.

You will write a tiny cart model. The public API will look like normal domain
code: `cart.items`, `cart.itemCount`, and `cart.totalCents`. Starbeam makes it
reactive because those reads touch marked root state internally.

## Install Starbeam

For this walkthrough, install the framework-neutral package and the reactive
collections package:

```sh
pnpm add @starbeam/universal @starbeam/collections
```

Framework apps usually install these packages plus the adapter for their
framework, such as `@starbeam/react`, `@starbeam/preact`, `@starbeam/vue`, or
`@starbeam/svelte`. This page stays framework-neutral; framework guides cover
the adapter APIs.

## Import the first root state helper

The first example uses a reactive `Map` for root state:

```ts
import { reactive } from "@starbeam/collections";
```

## Mark root state with a collection

A reactive collection has the same shape as the corresponding JavaScript
collection. Keep it private and expose the shape your app wants.

```ts
import { reactive } from "@starbeam/collections";

interface LineItem {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
  readonly quantity: number;
}

class Cart {
  #items = reactive.Map<string, LineItem>();

  get items(): readonly LineItem[] {
    return [...this.#items.values()];
  }

  add(item: LineItem): void {
    this.#items.set(item.id, item);
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
}
```

`#items` is the root state. It is reactive, but its API is still the ordinary
`Map` API: `set()`, `values()`, `get()`, `has()`, and `delete()`.

The rest of the class is ordinary JavaScript. `items`, `add()`, `itemCount`, and
`totalCents` are domain-shaped methods and getters built above the root state.

Cells are still useful for scalar root state. Collections are a better starting
point here because a cart is naturally collection-shaped.

## Derive values with ordinary JavaScript

Derived values do not need a wrapper just because they read reactive state. In
the cart above, `itemCount` and `totalCents` are plain getters.

```ts
const cart = new Cart();

cart.totalCents; // 0

cart.add({ id: "tea", name: "Tea", priceCents: 500, quantity: 2 });

cart.itemCount; // 2
cart.totalCents; // 1000
```

The getters read `cart.items`. `cart.items` reads the private collection.
Starbeam sees those reads without asking you to wire dependencies by hand.

:::note[Looking for `derived()`?]
You usually do not need a wrapper for derived domain values. Use ordinary
functions, getters, methods, and classes until something needs a reactive value
as an output boundary.

Framework adapters create those boundaries for rendering, so app code often does
not create them directly. Later docs cover cached derived work for expensive
computations.
:::

## Keep the public shape domain-first

The consumer of `Cart` does not need to know about `#items`.

```ts
cart.items;
cart.itemCount;
cart.totalCents;
```

That is the pattern to prefer: mark root state, then expose domain-shaped
JavaScript above it.

## Preview resources

Some state needs more than a value. It needs setup, sync, and cleanup.

A `Resource` keeps the same private-state and domain-shaped-return pattern, but
adds lifecycle hooks. This example is a preview; framework adapters normally
schedule resources for you.

```ts
import { Cell, Resource } from "@starbeam/universal";

const Clock = Resource(({ on }) => {
  const now = Cell(Date.now());

  on.sync(() => {
    const timer = setInterval(() => {
      now.set(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  });

  return {
    get now(): number {
      return now.current;
    },
  };
});
```

The resource returns an ordinary object with a `now` getter. The lifecycle work is
attached to the resource, not pushed through every caller.

## Legible to humans and agents

Starbeam does not ask an AI agent to translate every domain idea into a reactive
DSL before the code can become reactive. The important abstractions stay local,
inspectable JavaScript: modules, classes, methods, getters, collections, and
explicit lifecycle setup, sync, and cleanup.

The developer still owns the design. Starbeam keeps the reactive boundary small
enough that both the human and the agent can reason about the rest of the system
as JavaScript.

## Next steps

- Read [Core concepts](/concepts/overview/) for the map of Starbeam's model.
- Read [Framework guides](/frameworks/overview/) to see how adapters connect this
  model to React, Preact, Vue, and Svelte.
