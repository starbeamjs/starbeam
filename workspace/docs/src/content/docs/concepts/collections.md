---
title: Collections and objects
description: "Define reactive versions of ordinary JavaScript objects and built-in collections while keeping their JavaScript and TypeScript surface."
---

Starbeam lets you define reactive versions of ordinary JavaScript objects and
built-in collections. They keep their JavaScript and TypeScript surface:
`reactive.Map<K, V>()` gives you a `Map<K, V>`, `reactive.Set<T>()` gives you a
`Set<T>`, and `reactive.object(value)` gives you the same object type back. You
use normal property syntax and built-in collection APIs; Starbeam tracks the
reads and writes underneath.

Use those reactive objects and collections when your state already has a
JavaScript shape. A cart is a map of line items. A registry is a map of entries.
A clock is an object with a `now` property.

The rule is the same as the Start guide:

> Mark root state. Keep the rest JavaScript.

## Install and import

```sh
pnpm add @starbeam/collections
```

```ts
import { reactive } from "@starbeam/collections";
```

Use the named `reactive` import. It exposes helpers for ordinary objects and
built-in collection types:

| Helper                     | Use for                                       |
| -------------------------- | --------------------------------------------- |
| `reactive.Map<K, V>()`     | keyed records, registries, caches, carts      |
| `reactive.Set<T>()`        | membership, selection, tags                   |
| `reactive.array<T>([])`    | ordered list state                            |
| `reactive.object({ ... })` | object-shaped state, including one-slot state |
| `reactive.WeakMap<K, V>()` | object-keyed storage with weak ownership      |
| `reactive.WeakSet<T>()`    | weak object membership                        |

`reactive.Map()` and `reactive.Set()` create empty collections. Add entries with
the normal JavaScript methods: `set()`, `add()`, and `delete()`.

`reactive.object()` and `reactive.array()` wrap an initial object or array.

## Keep storage private

A reactive collection is usually an implementation detail. Keep it private,
then expose the domain-shaped reads and writes your app wants.

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

  add(item: LineItem): void {
    this.#items.set(item.id, item);
  }

  remove(id: string): void {
    this.#items.delete(id);
  }
}
```

The private `Map` is the root state. `items`, `itemCount`, `totalCents`, `add()`,
and `remove()` are ordinary JavaScript above that state.

Consumers do not need to know that `Cart` uses a reactive collection internally.
They read `cart.totalCents` because that is the domain value they care about.

## Use object-shaped state for object-shaped values

If your state is an object, use a reactive object. That is true even when the
object only has one public slot.

```ts
import { reactive } from "@starbeam/collections";

const clock = reactive.object({ now: new Date() });

clock.now = new Date();
clock.now;
```

This keeps the public shape ordinary: `clock.now`. If your domain wants a
`current` property, make that shape explicit:

```ts
const currentUser = reactive.object({ current: null as User | null });

currentUser.current = { id: "tom", name: "Tom Dale" };
```

Use the shape that matches the value your app wants to expose. Lower-level
storage primitives are useful when you are building new reactive primitives, not
as the default way to teach app state.

## Choose the collection shape from the domain

Use the shape that gives your domain the right operations.

```ts
import { reactive } from "@starbeam/collections";

export class Selection {
  #ids = reactive.Set<string>();

  get size(): number {
    return this.#ids.size;
  }

  isSelected(id: string): boolean {
    return this.#ids.has(id);
  }

  select(id: string): void {
    this.#ids.add(id);
  }

  deselect(id: string): void {
    this.#ids.delete(id);
  }

  clear(): void {
    this.#ids.clear();
  }
}
```

A `Set` makes membership the root-state operation. A `Map` makes keyed lookup and
value replacement the root-state operation. An object makes named properties the
root-state operation. An array makes order and index access the root-state
operation.

## What updates?

Starbeam tracks the JavaScript read your code performed.

For a `Map`:

- `map.has(key)` tracks whether that key is present.
- `map.get(key)` tracks the value for that key.
- `map.size` and `map.keys()` track membership changes.
- `map.values()`, `map.entries()`, spreading, and `forEach()` track value
  iteration.

That means a read that only checks membership does not need to update when an
existing value changes.

```ts
const recipes = reactive.Map<string, { url: string }>();

recipes.set("pie", { url: "https://example.com/pie" });

function hasDessert(): boolean {
  return recipes.has("pie") || recipes.has("cookies");
}

function recipeUrls(): string[] {
  return [...recipes.values()].map((recipe) => recipe.url);
}
```

Updating the URL for `"pie"` changes the result of `recipeUrls()`, but it does
not change whether the map has a `"pie"` entry. Starbeam can preserve that
membership-only read.

For a `Set`, `set.has(value)` tracks membership for that value. Adding a value
that is already present does not change membership.

For objects, use the same intuition: a direct property read is narrower than
enumerating the whole object.

Arrays track length, indices, and iteration, but array updates can affect the
surrounding list shape. Treat array iteration and list mutations as broader than
direct object-property reads.

Starbeam tracks storage reads and writes. It does not compare the old output of a
getter with the new output to decide whether a read should update.

## Collections and lifecycle

Reactive collections and objects are just root state. They do not need an owner,
provider, or app container.

Reach for a resource when the work has a lifetime: timers, subscriptions,
observers, sockets, DOM elements, or app-scoped services. A resource can still
return a reactive object or a domain object backed by private reactive
collections.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

export const Clock = Resource(({ on }) => {
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
```

The root state is still object-shaped. The resource adds setup and cleanup.

## Next steps

- [Resources and lifecycle](/concepts/lifecycle/): add setup, sync, and cleanup
  when work has a lifetime.
- [Library-author guide](/library-authors/overview/): expose reusable
  domain-shaped abstractions.
- [Reference](/reference/overview/): see the package map.
