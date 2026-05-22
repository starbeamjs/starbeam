---
title: Ember
description: "The Ember adapter connects Starbeam reads, resources, services, and element-backed resources to Glimmer autotracking and Ember lifetimes."
---

Ember components are the output boundary for a Starbeam model. Your state can
stay ordinary JavaScript: classes, getters, methods, maps, and resources.

The current Ember bridge is explicit. Use `fromStarbeam()` to turn a Starbeam
read into a Glimmer-autotracked value, then read its `current` getter from a
template, getter, helper, or modifier. Ember templates do not subscribe to raw
Starbeam reads on their own; the bridge dirties a Glimmer tag when Starbeam
invalidates the read.

The Ember adapter is experimental. It is available as a v2 Ember addon, but some
API names may still be refined as the adapter settles.

## Install

Install the Ember adapter with the framework-neutral Starbeam packages you will
use for root state and resources:

```sh
pnpm add @starbeam/ember @starbeam/universal @starbeam/collections
```

`ember-source` and `ember-modifier` are peer dependencies. Your Ember app usually
provides them already. The adapter targets Ember 4.12+ with Embroider.

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

## Read the model from Ember

Use `fromStarbeam()` at the Ember boundary. The callback reads ordinary
Starbeam-backed JavaScript. The returned value has a readonly `current` getter
that participates in Glimmer autotracking.

```gjs
import { on } from "@ember/modifier";
import Component from "@glimmer/component";
import { fromStarbeam } from "@starbeam/ember";

import { Cart } from "./cart.js";

const cart = new Cart();

export default class CartSummary extends Component {
  itemCount = fromStarbeam(() => cart.itemCount, { parent: this });
  totalLabel = fromStarbeam(
    () => `$${(cart.totalCents / 100).toFixed(2)}`,
    { parent: this },
  );

  addTea = () => {
    cart.add({ name: "Tea", priceCents: 500 });
  };

  <template>
    <section>
      <p>{{this.itemCount.current}} items</p>
      <p>{{this.totalLabel.current}}</p>

      <button type="button" {{on "click" this.addTea}}>Add tea</button>
    </section>
  </template>
}
```

The `Cart` shape does not change for Ember. The adapter boundary is the
`fromStarbeam(() => cart.totalCents)` call, not a special domain-object shape.

Do not rely on a template read like `{{cart.totalCents}}` to subscribe to
Starbeam state. It can compute a value during a render Ember already scheduled,
but Starbeam invalidations will not schedule Ember work unless the read goes
through the `fromStarbeam()` bridge.

Pass `parent: this` from components, helpers, and modifiers so Ember destroys the
bridge with the owner. Without a parent, call `disconnect()` yourself.

## Add lifecycle with `setupResource()`

Use a `Resource` when state needs setup, sync, or cleanup. `setupResource()` ties
the resource lifetime to an Ember destroyable, usually the component using it.
Use `fromStarbeam()` for template reads of the returned value.

```gjs
import Component from "@glimmer/component";
import { reactive } from "@starbeam/collections";
import { fromStarbeam, setupResource } from "@starbeam/ember";
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
  label = fromStarbeam(() => this.clock.now.toLocaleTimeString(), {
    parent: this,
  });

  <template>
    <time>{{this.label.current}}</time>
  </template>
}
```

The resource returns a domain-shaped value. Ember owns the lifetime: setup and
sync happen under the component owner, and cleanup/finalize run when Ember
destroys that owner. The template read still goes through `fromStarbeam()` so
Glimmer can see the Starbeam invalidation.

## App-scoped services

Use `setupService()` for resource-backed state that should live with the Ember
owner, not with one component. Pass an Ember owner so the service lifetime tracks
the app.

```gjs
import { getOwner } from "@ember/owner";
import Component from "@glimmer/component";
import { reactive } from "@starbeam/collections";
import { fromStarbeam, setupService } from "@starbeam/ember";
import { Resource } from "@starbeam/universal";

const SessionService = Resource(() => {
  return reactive.object({ userName: "Guest" });
});

export default class CurrentUser extends Component {
  session = setupService(SessionService, getOwner(this));
  userName = fromStarbeam(() => this.session.userName, { parent: this });

  <template>
    <p>{{this.userName.current}}</p>
  </template>
}
```

Two components in the same owner that ask for the same service blueprint receive
the same instance. Component teardown does not finalize the service; owner
teardown does.

## DOM element resources

Use `elementResourceModifier()` when a resource needs a DOM element from Ember.
It returns an Ember modifier. Pass `into` to publish the resource value into
tracked component state. See [Element resources and DOM attachment](/concepts/element-resources/)
for the framework-neutral concept.

```gts
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { reactive } from "@starbeam/collections";
import { elementResourceModifier } from "@starbeam/ember/modifier";
import { Resource } from "@starbeam/universal";

interface Size {
  readonly width: number;
  readonly height: number;
}

function ElementSize(element: HTMLElement) {
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

export default class SizedBox extends Component {
  @tracked size: Size | null = null;

  measure = elementResourceModifier(ElementSize, {
    into: (value) => {
      this.size = value;
    },
  });

  get label(): string {
    return this.size
      ? `${Math.round(this.size.width)} × ${Math.round(this.size.height)}`
      : "Measuring…";
  }

  <template>
    <section {{this.measure}}>{{this.label}}</section>
  </template>
}
```

The element comes from Ember. The resource work still lives in Starbeam. The
modifier owns the element lifetime, and `into` is the handoff from the modifier
back into Ember render data.

## Lower-level APIs

`resource()`, `useResource()`, `getResource()`, and `setupReactiveResource()` are
public resource helpers for Ember helper-manager and JavaScript integration
cases. Start with `setupResource()` when a component owns the resource.

`elementResource()` is an experimental convenience handle that pairs a modifier
with an autotracked `current` value:

```gjs
import { elementResource } from "@starbeam/ember/modifier";

export default class SizedBox extends Component {
  size = elementResource(ElementSize);

  <template>
    <section {{this.size.modifier}}>
      {{#if this.size.current}}
        {{this.size.current.width}} × {{this.size.current.height}}
      {{else}}
        Measuring…
      {{/if}}
    </section>
  </template>
}
```

The package also exports the public element-resource types:
`ElementResourceBlueprint`, `ElementResourceHandle`, `ElementResourceModifier`,
`ElementResourceModifierOptions`, and `ElementResourceSink`.

## Notes on the v2 addon

The package is shipped as a v2 Ember addon. Embroider resolves the internal
`@glimmer/*` imports to the bundled copies from `ember-source`. Do not add
separate `@glimmer/*` runtime packages to your app to fix resolution; duplicate
validator instances break the Glimmer tag bridge.

## Next steps

- [Core concepts](/concepts/overview/): the framework-neutral Starbeam model.
- [Services and app lifetime](/concepts/services/): app-scoped resource-backed
  state.
- [Element resources and DOM attachment](/concepts/element-resources/): resources
  attached to framework-supplied elements.
- [Framework overview](/frameworks/overview/): how the adapter boundary changes
  by framework.
- [Reference](/reference/overview/): the public package surface at a glance.
