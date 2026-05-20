# @starbeam/collections

Reactive JavaScript collections and objects for Starbeam root state.

Use this package when the state you want to track is already shaped like a
JavaScript `Map`, `Set`, array, or object. Mark that storage reactive, then keep
the rest of your model as ordinary JavaScript.

```sh
pnpm add @starbeam/collections
```

```ts
import { reactive } from "@starbeam/collections";
```

## Public helpers

| Helper                     | Use for                                       |
| -------------------------- | --------------------------------------------- |
| `reactive.Map<K, V>()`     | keyed records, registries, caches, carts      |
| `reactive.Set<T>()`        | membership, selection, tags                   |
| `reactive.array<T>([])`    | ordered list state                            |
| `reactive.object({ ... })` | object-shaped state, including one-slot state |
| `reactive.WeakMap<K, V>()` | object-keyed storage with weak ownership      |
| `reactive.WeakSet<T>()`    | weak object membership                        |

`reactive.Map()` and `reactive.Set()` create empty collections. Add entries with
the normal JavaScript methods.

```ts
const recipes = reactive.Map<string, { url: string }>();

recipes.set("pie", { url: "https://example.com/pie" });
recipes.has("pie");
recipes.get("pie");
```

`reactive.object()` and `reactive.array()` wrap an initial object or array.

```ts
const clock = reactive.object({ now: new Date() });
clock.now = new Date();

const items = reactive.array<string>([]);
items.push("tea");
```

Use the named `reactive` import in examples and application code.

## Domain-shaped models

Reactive storage is usually private. Expose the domain-shaped values and methods
that callers should use.

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
}
```

The private `Map` is root state. The public API is ordinary JavaScript:
`cart.items`, `cart.itemCount`, `cart.totalCents`, and `cart.add()`.

## One-slot state is still object-shaped

For app-facing docs and package examples, use the shape your app wants to expose.
If a value wants a `current` slot, model that slot as an object property.

```ts
const currentUser = reactive.object({ current: null as User | null });

currentUser.current = { id: "tom", name: "Tom Dale" };
```

Lower-level storage primitives are useful when you are building new reactive
primitives. Most app and library models should start with objects and
collections.

## Granular updates

Starbeam tracks the JavaScript read your code performed.

For a `Map`:

- `map.has(key)` tracks whether that key is present.
- `map.get(key)` tracks the value for that key.
- `map.size` and `map.keys()` track membership changes.
- `map.values()`, `map.entries()`, spreading, and `forEach()` track value
  iteration.

For a `Set`, `set.has(value)` tracks membership for that value. Adding a value
that is already present does not change membership.

Objects follow the same idea: a direct property read is narrower than enumerating
the whole object.

Arrays track length, indices, and iteration, but array updates can affect the
surrounding list shape. Treat array iteration and list mutations as broader than
direct object-property reads.

Starbeam tracks storage reads and writes. It does not compare the previous output
of a getter with the next output to decide whether a read should update.

## Learn more

- [Start with root state](https://starbeamjs.com/start/introduction/): build a
  first Starbeam model.
- [Collections and objects](https://starbeamjs.com/concepts/collections/): learn
  the app-facing collections model.
- [Library-author guide](https://starbeamjs.com/library-authors/overview/): write
  reusable domain-shaped abstractions.
- [Reference](https://starbeamjs.com/reference/overview/): see the public package
  surface.
