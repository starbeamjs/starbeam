---
title: Core concepts
description: "A map of Starbeam's reactive model: root state, derived reads, resources, services, and framework integration."
---

Starbeam makes reactivity compositional without making application code exotic.
The mechanism is reactive; your application model can keep the shape of ordinary
JavaScript.

## Root state

Root state is the storage Starbeam tracks directly. Most app models should start
with the shape of the data: use `@starbeam/collections` when the state is
collection-shaped or object-shaped.

```ts
import { reactive } from "@starbeam/collections";

interface LineItem {
  readonly quantity: number;
}

class Cart {
  #items = reactive.Map<string, LineItem>();

  get items(): readonly LineItem[] {
    return [...this.#items.values()];
  }

  get itemCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }
}
```

The private `Map` is the root state. The public reads are ordinary JavaScript.
This is where you mark the boundary between changing data and the domain code
that reads it. See [Collections and objects](/concepts/collections/) for the
app-facing root-state model.

## Reactive values

A reactive value is any value whose result depends on reactive storage. It might
be a reactive collection, a reactive object, a resource, or a domain object with
getters and methods that read root state internally.

The public shape can still look like your app:

- `session.user`;
- `cart.total`;
- `form.isValid`;
- `size.width`.

## Derived reads

Derived reads are ordinary functions, getters, methods, and formulas that read
reactive state. In the cart example, `items` and `itemCount` are just getters
above the private collection. Starbeam records what they read when they run,
then uses that read trace to validate cached work or update framework renderers.

You do not list dependencies by hand.

## Resources

Resources model state with a lifetime. Use them when reactive state needs setup,
sync, or cleanup: subscriptions, external handles, element work, and other values
that should start and stop with an owner. See
[Resources and lifecycle](/concepts/lifecycle/) for the app-author path from
resources to services and element resources.

## Services and app lifetime

Services are resource-backed state with an app-scoped lifetime. They are useful
for shared application concerns that should live as long as the app or framework
root lives.

## Element resources

Element resources attach resource work to DOM elements supplied by a framework.
They let Starbeam model setup, sync, and cleanup for element-backed behavior
without turning Starbeam into a framework replacement.

## Advanced details

The low-level mechanisms explain how the model works. They belong in advanced
docs. The first-run model is smaller:

> Mark root state. Keep the rest JavaScript.
