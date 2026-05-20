---
title: Library-author guide
description: "Write reusable Starbeam abstractions that stay framework-neutral and domain-shaped."
---

This guide is for authors of reusable Starbeam-backed libraries: models,
resources, and utilities that app authors can use from React, Preact, Vue,
Svelte, or framework-neutral code.

The goal is the same as app code: mark root state, then expose ordinary
JavaScript above it. Your library should give consumers domain-shaped values,
not reactive plumbing.

## Start with framework-neutral packages

Most reusable libraries start with the same packages as framework-neutral app
models:

```sh
pnpm add @starbeam/universal @starbeam/collections
```

Use `@starbeam/collections` for collection-shaped root state:

```ts
import { reactive } from "@starbeam/collections";
```

Use `@starbeam/universal` for resources and framework-neutral lifecycle APIs:

```ts
import { Resource } from "@starbeam/universal";
```

Reach for direct packages only when your library needs lower-level APIs. See
[Install Starbeam](/start/install/) for the app-author package chooser.

## Expose domain-shaped values

Keep reactive storage private. Export classes, functions, resources, and plain
objects whose public shape matches the domain.

```ts
import { reactive } from "@starbeam/collections";

export interface LineItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly priceCents: number;
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

Consumers read `cart.itemCount` and `cart.totalCents`. The private `Map` is the
root state; the public API is ordinary JavaScript.

## Prefer collections for collection-shaped state

Use the shape of the data as the starting point. Lists, maps, sets, and records
should usually use reactive collections instead of scalar wrappers.

```ts
import { reactive } from "@starbeam/collections";

export class Registry<T extends { readonly id: string }> {
  #entries = reactive.Map<string, T>();

  get all(): readonly T[] {
    return [...this.#entries.values()];
  }

  get size(): number {
    return this.#entries.size;
  }

  add(value: T): void {
    this.#entries.set(value.id, value);
  }

  get(id: string): T | undefined {
    return this.#entries.get(id);
  }
}
```

The collection API stays recognizable: `set()`, `get()`, `values()`, `size`, and
iteration all keep their JavaScript meaning.

## Write reusable resources

Use a `Resource` when your abstraction owns setup, sync, or cleanup work. The
resource definition stays framework-neutral; each adapter decides when to sync
and finalize it.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

interface Size {
  readonly width: number;
  readonly height: number;
}

export function ElementSize(element: Element) {
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

    const value: Size = size;
    return value;
  });
}
```

The resource returns the value consumers want to read: `size.width` and
`size.height`. The observer and cleanup stay inside the resource.

## Let adapters consume your library

A framework adapter should be the only framework-specific layer. The same
framework-neutral resource can be consumed by each framework in its own way:

- React and Preact use element-resource hooks.
- Vue uses an element-resource directive.
- Svelte uses Svelte 5 attachments.

Your package should usually export the framework-neutral model or resource. App
code imports the adapter for the framework that owns rendering.

```ts
export { Cart } from "./cart.js";
export { ElementSize } from "./element-size.js";
```

If you publish framework-specific convenience wrappers, keep them in separate
entry points so the core model remains usable without that framework.

## When to import direct packages

The default library-author imports are `@starbeam/universal` and
`@starbeam/collections`. Direct packages are for narrower cases.

### `@starbeam/resource`

Import `@starbeam/resource` directly when you need lower-level resource APIs such
as manual setup or reusable sync helpers. Most reusable resource definitions can
import `Resource` from `@starbeam/universal`.

### `@starbeam/reactive`

Import `@starbeam/reactive` directly when you are writing primitives that need
`Formula`, `CachedFormula`, or other low-level reactive values. Keep those values
inside your abstraction unless they are the API you intentionally expose.

### `@starbeam/service`

Avoid making app authors consume `@starbeam/service` directly. Framework adapters
provide the app-facing service helpers where service support is available. Use
the lower-level service package only for adapter-level or integration code.

### `@starbeam/core`

Do not use `@starbeam/core` for new library code. It is a deprecated
compatibility alias for `@starbeam/universal`.

## Out of scope

This guide is not the adapter-author guide. It does not cover renderer managers,
runtime internals, protocol packages, or framework integration internals. Those
belong in advanced docs.

## Next steps

- [Install Starbeam](/start/install/): choose app and library packages.
- [Resources and lifecycle](/concepts/lifecycle/): understand setup, sync, and
  cleanup.
- [Framework guides](/frameworks/overview/): see how adapters consume reusable
  models and resources.
- [Reference](/reference/overview/): see the public package surface.
