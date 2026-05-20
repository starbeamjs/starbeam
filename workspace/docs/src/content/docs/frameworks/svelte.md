---
title: Svelte
description: "The Svelte adapter connects Starbeam reads and element-backed resources to Svelte 5 components and attachments."
---

Svelte components are the output boundary for a Starbeam model. Your state can
stay ordinary JavaScript: classes, getters, methods, maps, and resources.

The current Svelte bridge is explicit. Use `fromStarbeam()` to turn a Starbeam
read into a Svelte-readable value, then read its `current` getter from markup,
`$derived`, or `$effect`. Svelte does not yet track a domain getter like
`cart.totalCents` directly without that boundary.

## Install

Install the Svelte adapter with the framework-neutral Starbeam packages you will
use for root state and resources:

```sh
pnpm add @starbeam/svelte @starbeam/universal @starbeam/collections
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

## Read the model from Svelte

Use `fromStarbeam()` in the Svelte component. The callback reads ordinary
Starbeam-backed JavaScript. The returned value has a readonly `current` getter
that Svelte can read.

```svelte
<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";

  import { Cart } from "./cart.js";

  const cart = new Cart();
  const itemCount = fromStarbeam(() => cart.itemCount);
  const total = fromStarbeam(() => cart.totalCents);

  function addTea() {
    cart.add({ name: "Tea", priceCents: 500 });
  }
</script>

<section>
  <p>{itemCount.current} items</p>
  <p>${(total.current / 100).toFixed(2)}</p>

  <button type="button" onclick={addTea}>Add tea</button>
</section>
```

The `Cart` shape does not change for Svelte. The adapter boundary is the
`fromStarbeam(() => cart.totalCents)` call, not a special domain-object shape.

`fromStarbeam()` is experimental. Deeper Svelte integration is tracked in
[starbeamjs/starbeam#261](https://github.com/starbeamjs/starbeam/issues/261).

## Svelte runes and server render

The current bridge is tested with the Svelte 5 places where a component can read
state: templates, `$derived`, and `$effect`.

```svelte
<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import { reactive } from "@starbeam/collections";

  const count = reactive.object({ current: 1 });
  let multiplier = $state(2);

  const total = fromStarbeam(() => count.current * multiplier);
  const label = $derived(`total=${total.current}`);

  $effect(() => {
    document.title = `Cart total: ${total.current}`;
  });

  function increment() {
    count.current++;
  }

  function triple() {
    multiplier = 3;
  }
</script>

<p>{label}</p>
<button type="button" onclick={increment}>Increment</button>
<button type="button" onclick={triple}>Triple</button>
```

The callback may read Starbeam state and Svelte `$state`. It is also tested with
dynamic Starbeam dependencies, including a callback that gains its first
Starbeam dependency after the initial render.

On the server, `fromStarbeam()` computes synchronously during render. Browser DOM
work still belongs in Svelte effects or element resources.

## DOM element resources

Use `elementResource()` when a resource needs a DOM element from Svelte. It
returns one Svelte-readable store that is also attachable. Attach it with
`size.attach`; read the resource value with Svelte store syntax.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

export interface Size {
  readonly width: number;
  readonly height: number;
}

export function ElementSize(element: HTMLElement) {
  return Resource(({ on }) => {
    const size = reactive.object({ width: 0, height: 0 }) satisfies Size;

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
```

```svelte
<script lang="ts">
  import { elementResource } from "@starbeam/svelte";

  import { ElementSize } from "./element-size.js";

  const size = elementResource(ElementSize);
</script>

<section {@attach size.attach}>
  {$size
    ? `${Math.round($size.width)} × ${Math.round($size.height)}`
    : "Measuring…"}
</section>
```

The element comes from Svelte. The resource work still lives in Starbeam.
`elementResource()` and `elementResourceStore()` publish the domain-shaped
resource value, so the store value is `$size.width`, not `$size.width.current`.
The attachment owns the resource lifetime and finalizes it when Svelte detaches
the element.

## Lower-level element APIs

`elementResourceStore()` is the explicit store-shaped spelling. It returns the
same attachable/readable shape as `elementResource()`.

```ts
const size = elementResourceStore(ElementSize);
```

`elementResourceAttachment()` is the lower-level attachment spelling. Use it
when you want to publish the resource value into state you own.

```svelte
<script lang="ts">
  import { elementResourceAttachment } from "@starbeam/svelte";

  import { ElementSize, type Size } from "./element-size.js";

  let size = $state<Size | null>(null);

  const attachSize = elementResourceAttachment(ElementSize, {
    into(value) {
      size = value;
    },
  });
</script>

<section {@attach attachSize}>
  {size
    ? `${Math.round(size.width)} × ${Math.round(size.height)}`
    : "Measuring…"}
</section>
```

The package also exports the public element-resource types:
`ElementResourceBlueprint`, `ElementResourceAttachment`, `ElementResourceHandle`,
and `ElementResourceSink`.

## Not available yet

The Svelte adapter does not yet expose component-lifetime `Resource` helpers or
app-scoped `Service` helpers. Use `fromStarbeam()` for component reads and
`elementResource()` for DOM element resources today. Track deeper Svelte adapter
work in [starbeamjs/starbeam#261](https://github.com/starbeamjs/starbeam/issues/261).

## Next steps

- [Core concepts](/concepts/overview/): the framework-neutral Starbeam model.
- [Framework overview](/frameworks/overview/): how the adapter boundary changes
  by framework.
- [Reference](/reference/overview/): the public package surface at a glance.
