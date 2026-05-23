---
title: Ember
description: "The Ember adapter mirrors Starbeam reads into Glimmer autotracking and connects resources, services, and element-backed resources to Ember lifetimes."
---

Ember is a native autotracking boundary for a Starbeam model. Your state can stay
ordinary JavaScript: classes, getters, methods, maps, and resources. The Ember
adapter mirrors Starbeam reads into Glimmer tags, so templates, component
getters, `@cached` getters, helpers, and modifiers can follow Starbeam-backed
state through normal Ember rendering.

> Experimental. The adapter ships as a v2 Ember addon for Ember 4.12+ with
> Embroider. API names may still be refined.

## Install

Install the Ember adapter with the framework-neutral Starbeam packages you will
use for root state and resources:

```sh
pnpm add @starbeam/ember @starbeam/universal @starbeam/collections
```

`ember-source` is a peer dependency. `ember-modifier` is optional unless you use
element-resource modifiers.

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

## Read app models through services

Ember apps usually put long-lived app state behind services. Model the service
as a Starbeam resource, then read the service value from normal Ember getters
and templates.

```gjs
import { on } from "@ember/modifier";
import { getOwner } from "@ember/owner";
import Component from "@glimmer/component";
import { setupService } from "@starbeam/ember";
import { Resource } from "@starbeam/universal";

import { Cart } from "./cart";

const CartService = Resource(() => new Cart());

export default class CartSummary extends Component {
  cart = setupService(CartService, getOwner(this));

  get itemCount() {
    return this.cart.itemCount;
  }

  get total() {
    return `$${(this.cart.totalCents / 100).toFixed(2)}`;
  }

  addTea = () => {
    this.cart.add({ name: "Tea", priceCents: 500 });
  };

  <template>
    <section>
      <p>{{this.itemCount}} items</p>
      <p>{{this.total}}</p>

      <button type="button" {{on "click" this.addTea}}>Add tea</button>
    </section>
  </template>
}
```

The getters are ordinary Ember getters. During render, Glimmer sees Starbeam
storage reads through mirrored Glimmer tags. When `addTea()` mutates the cart,
Ember rerenders any template or cached getter that consumed the Starbeam-backed
read.

## Mixing Starbeam and Ember state

Ember owns the render tracking frame. A getter can combine Starbeam-backed model
state with Ember `@tracked` state, and Glimmer will rerender when either side
changes.

```gjs
import { on } from "@ember/modifier";
import { tracked } from "@glimmer/tracking";
import Component from "@glimmer/component";

import { cart } from "./cart";

export default class DiscountedTotal extends Component {
  @tracked discountPercent = 0;

  get total() {
    const discount = this.discountPercent / 100;
    const discounted = cart.totalCents * (1 - discount);

    return `$${(discounted / 100).toFixed(2)}`;
  }

  applyDiscount = () => {
    this.discountPercent = 10;
  };

  addTea = () => {
    cart.add({ name: "Tea", priceCents: 500 });
  };

  <template>
    <p>{{this.total}}</p>
    <button type="button" {{on "click" this.applyDiscount}}>10% off</button>
    <button type="button" {{on "click" this.addTea}}>Add tea</button>
  </template>
}
```

Use lower-level reactive primitives only when you are building adapter-level
utilities or reusable reactive abstractions. App-facing Ember code should prefer
domain-shaped objects and getters.

## Add lifecycle with `setupResource()`

Use a `Resource` when state needs setup, sync, or cleanup. `setupResource()` ties
the resource to an Ember destroyable, usually the component that owns it.

```gjs
import Component from "@glimmer/component";
import { setupResource } from "@starbeam/ember";
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

export default class ClockLabel extends Component {
  clock = setupResource(Clock, this);

  get time() {
    return this.clock.now.toLocaleTimeString();
  }

  <template>
    <time>{{this.time}}</time>
  </template>
}
```

The resource returns a domain-shaped value. Ember reads that value normally, and
Starbeam reruns the resource sync when Starbeam-level dependencies change.

### Resource sync and Ember-owned state

Starbeam can mirror its reads into Glimmer, but Glimmer-owned state is not added
to Starbeam's subscription graph. That is fine for render-time reads, where
Glimmer is the consumer.

Resource `sync` is different: Starbeam owns that sync subscription. If a sync
handler depends on Ember-owned `@tracked` state or args, pass that state through
an explicit Ember boundary so the resource syncs when it changes. Do not rely on
Starbeam to subscribe to Glimmer state from inside `on.sync()`.

## App-scoped services

Use `setupService()` or `useService()` for resource-backed state that should live
with the Ember owner, not with one component.

```gjs
import { getOwner } from "@ember/owner";
import Component from "@glimmer/component";
import { setupService } from "@starbeam/ember";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

const SessionService = Resource(() => {
  return reactive.object({ userName: "Guest" });
});

export default class CurrentUser extends Component {
  session = setupService(SessionService, getOwner(this));

  get userName() {
    return this.session.userName;
  }

  <template>
    <p>{{this.userName}}</p>
  </template>
}
```

Two components in the same owner that ask for the same blueprint receive the
same instance. The instance is finalized when the owner is destroyed.

## DOM element resources

Use `elementResourceModifier()` when a resource needs a DOM element from Ember.
The modifier owns the element lifetime. Pass `into` to publish the resource value
into tracked component state.

```gjs
import { on } from "@ember/modifier";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";
import { elementResourceModifier } from "@starbeam/ember/modifier";

function ElementSize(element) {
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

export default class SizedBox extends Component {
  @tracked size = null;

  measure = elementResourceModifier(ElementSize, {
    into: (value) => (this.size = value),
  });

  get label() {
    return this.size
      ? `${Math.round(this.size.width)} × ${Math.round(this.size.height)}`
      : "Measuring…";
  }

  <template>
    <section {{this.measure}}>{{this.label}}</section>
  </template>
}
```

`elementResource()` is also available as a handle that pairs a modifier with a
tracked `current` value.

## Explicit bridge objects

Use `fromStarbeam()` for lower-level integrations that need a stable object with
explicit disconnect lifecycle. Most app-facing Ember reads do not need it.

## Notes

- The adapter imports Glimmer tag primitives from Ember's bundled Glimmer
  packages. Do not add separate `@glimmer/*` packages to an app to "fix"
  resolution; duplicate validator instances break tag bridging.
- The adapter is still experimental. Prefer domain-shaped examples and avoid
  building app APIs around lower-level bridge objects.

## Next steps

- Read [Core concepts](/concepts/overview/) for the model behind the adapter.
- Read [Resources and lifecycle](/concepts/lifecycle/) for setup, sync, and
  cleanup.
- Read [Element resources and DOM attachment](/concepts/element-resources/) for
  DOM-backed resources.
- Read [Reference](/reference/overview/) for the public package surface.
