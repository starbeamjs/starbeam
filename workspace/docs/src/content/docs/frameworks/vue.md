---
title: Vue
description: "The Vue adapter connects Starbeam reads, resources, services, and element-backed resources to Vue setup, render, and directives."
---

Vue setup is the output boundary for a Starbeam model. Your state can stay
ordinary JavaScript: classes, getters, methods, maps, and resources. The Vue
adapter connects that model to Vue's setup, render, component lifetime, app
lifetime, and directive APIs.

The main difference from the React and Preact guides is where the bridge lives:
Vue uses Composition API setup helpers and directives. There is no React-style
callback hook with a dependency array, and there is no Preact-style
`install(options)` render hook.

## Install

Install the Vue adapter with the framework-neutral Starbeam packages you will
use for root state and resources:

```sh
pnpm add @starbeam/vue @starbeam/universal @starbeam/collections
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

## Read the model from Vue

Use `useReactive()` in setup or `<script setup>` when the template reads
Starbeam-backed JavaScript directly. `<script setup>` gives each Vue component
instance its own JavaScript variables. `useReactive()` registers that component
with Starbeam, so Starbeam can track the reads that happen during Vue render.

```vue
<script setup lang="ts">
import { useReactive } from "@starbeam/vue";

import { Cart } from "./cart.js";

useReactive();

const cart = new Cart();
</script>

<template>
  <section>
    <p>{{ cart.itemCount }} items</p>
    <p>${{ (cart.totalCents / 100).toFixed(2) }}</p>

    <button type="button" @click="cart.add({ name: 'Tea', priceCents: 500 })">
      Add tea
    </button>
  </section>
</template>
```

The `Cart` instance is ordinary JavaScript. What makes this reactive is that its
getters read the private reactive `Map`. When Vue renders the template, it reads
`cart.itemCount` and `cart.totalCents`; those getters touch the reactive
collection. When the collection changes, Starbeam asks Vue to rerender the
component in the normal way.

Use `setupReactive()` when you want to expose a specific Starbeam read as a Vue
ref instead of reading an object directly in the template.

```ts
const itemCount = setupReactive(() => cart.itemCount);
```

Most app code starts with `useReactive()` for direct template reads,
`setupResource()` for resources, `setupService()` for services, or an
element-resource directive for DOM-backed work.

## Add lifecycle with `setupResource()`

Use a `Resource` when state needs setup, sync, or cleanup. `setupResource()`
gives the resource a Vue component lifetime and returns the resource's
domain-shaped value.

```vue
<script setup lang="ts">
import { setupResource } from "@starbeam/vue";
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

const clock = setupResource(Clock);
</script>

<template>
  <time>{{ clock.now.toLocaleTimeString() }}</time>
</template>
```

The resource returns ordinary domain data. Vue render reads that data through
the Starbeam/Vue bridge that `setupResource()` created for the component. Vue
owns the timing: sync runs from Vue's component lifecycle, and cleanup/finalize
run when Vue unmounts the component.

## DOM element resources

Use `elementResourceDirective()` when a resource needs a DOM element from Vue.
It returns a Vue directive. Directives do not return template values, so pass an
`into` ref when the component needs to display the resource value.
See [Element resources and DOM attachment](/concepts/element-resources/) for the
framework-neutral concept.

```vue
<script setup lang="ts">
import { elementResourceDirective } from "@starbeam/vue";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";
import { shallowRef } from "vue";

interface Size {
  readonly width: number;
  readonly height: number;
}

function ElementSize(element: Element) {
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

const size = shallowRef<Size | null>(null);
const vSize = elementResourceDirective(ElementSize, { into: size });
</script>

<template>
  <section v-size>
    {{
      size
        ? `${Math.round(size.width)} × ${Math.round(size.height)}`
        : "Measuring…"
    }}
  </section>
</template>
```

The element comes from Vue. The resource work still lives in Starbeam. The
`into` ref is the explicit handoff from the directive lifetime back into the
component's render data.

## App-scoped services

Use `setupService()` for resource-backed state that should live for the Vue app,
not for one component. Install `Starbeam` on the Vue app so services have the
app as their owner.
See [Services and app lifetime](/concepts/services/) for the framework-neutral
concept.

```ts
import { Starbeam } from "@starbeam/vue";
import { createApp } from "vue";

import { App } from "./app.js";

createApp(App).use(Starbeam).mount("#app");
```

Then read the service from component setup.

```vue
<script setup lang="ts">
import { setupService } from "@starbeam/vue";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

const SessionService = Resource(() => {
  return reactive.object({ userName: "Guest" });
});

const session = setupService(SessionService);
</script>

<template>
  <p>{{ session.userName }}</p>
</template>
```

`Starbeam` gives the adapter an app lifetime for service ownership. Component
rendering still follows Vue's normal setup and render lifecycle.

## Lower-level APIs

`useReactive()` is public for components that directly render Starbeam reads
without using another setup helper. It makes the current Vue component
Starbeam-aware, but it does not create a Vue ref by itself.

`elementResource()` is public as an experimental lower-level handle. It returns
a Vue ref augmented with a directive:

```ts
const size = elementResource(ElementSize);
const vSize = size.directive;
```

That handle is useful when you want one object that is both readable in setup
and attachable as a directive. For a first app path, prefer
`elementResourceDirective(ElementSize, { into: size })` so the template value is
explicit.

The Vue package also exports public element-resource types, including
`ElementResourceBlueprint`, `ElementResourceDirectiveOptions`, and
`ElementResourceHandle`.

## Next steps

- [Core concepts](/concepts/overview/): the framework-neutral Starbeam model.
- [Services and app lifetime](/concepts/services/): app-scoped resource-backed
  state.
- [Element resources and DOM attachment](/concepts/element-resources/): resources
  attached to framework-supplied elements.
- [Framework overview](/frameworks/overview/): how the adapter boundary changes
  by framework.
- [Reference](/reference/overview/): the public package surface at a glance.
