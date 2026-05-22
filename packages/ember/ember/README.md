# @starbeam/ember

Ember adapter for Starbeam reactive reads, resources, services, and
element-backed resources.

> Experimental. Shipped as a v2 Ember addon. Targets Ember 4.12+ with
> Embroider. Reads bridge through Glimmer's autotracking system, so anything
> that participates in autotracking — templates, `@cached` getters,
> modifiers, helpers — sees Starbeam state.

## Install

```sh
pnpm add @starbeam/ember
```

`ember-source` and `ember-modifier` are peer dependencies and are provided by
your Ember app.

## Public APIs

- `fromStarbeam(compute, options?)`: bridge a Starbeam compute into Glimmer's
  autotracking system.
- `setupResource(blueprint, parent)`: create a Starbeam resource scoped to a
  destroyable.
- `setupService(blueprint, owner?)`: app-scoped service.
- `elementResourceModifier(blueprint, options?)`: element-backed resource as
  an Ember modifier (subpath: `@starbeam/ember/modifier`).
- `elementResource(blueprint)`: handle that pairs a tracked `current` value
  with a modifier.

## Reactive reads

```gjs
import Component from "@glimmer/component";
import { cart } from "./cart";

export default class CartTotal extends Component {
  get total() {
    return cart.totalCents;
  }

  <template>
    <p>{{this.total}}</p>
  </template>
}
```

Starbeam cells and collections participate in Glimmer autotracking. Keep
Starbeam cells and collections private inside your domain objects; expose
domain-shaped getters and read them normally from components and templates.

`fromStarbeam()` is still available when a caller needs an explicit read-only
`current` handle and `disconnect()` lifecycle.

Pass `options.parent` to tie the subscription to a destroyable (component,
modifier, helper, owner). Without `parent`, the caller must invoke
`disconnect()` to release the subscription.

## Resources

`setupResource()` creates a Starbeam resource and ties its lifetime to a
destroyable parent — typically the component using it. The resource's value can
be read from a normal getter or template expression:

```gjs
import Component from "@glimmer/component";
import { setupResource } from "@starbeam/ember";
import { Stopwatch } from "./stopwatch";

export default class Clock extends Component {
  stopwatch = setupResource(Stopwatch, this);

  get time() {
    return this.stopwatch.time;
  }

  <template>
    <p>{{this.time}}</p>
  </template>
}
```

The resource is synced on setup and re-synced (microtask-coalesced) when its
Starbeam dependencies change. It is finalized when the parent is destroyed.

## Services

`setupService()` resolves an app-scoped resource. Pass the Ember owner so the
service's lifetime tracks the application:

```gjs
import Component from "@glimmer/component";
import { getOwner } from "@ember/owner";
import { setupService } from "@starbeam/ember";
import { Session } from "./session";

export default class Header extends Component {
  session = setupService(Session, getOwner(this));

  get name() {
    return this.session.user.name;
  }

  <template>
    <span>{{this.name}}</span>
  </template>
}
```

Two components in the same owner that ask for the same blueprint receive the
same instance.

## Element resources

`elementResourceModifier()` exposes an element-backed Starbeam resource as an
Ember modifier. Pass `options.into` to publish the resource value into
caller-owned storage:

```gjs
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { Cell, Resource } from "@starbeam/universal";
import { elementResourceModifier } from "@starbeam/ember/modifier";

function ElementSize(element) {
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
      get width() { return width.current; },
      get height() { return height.current; },
    };
  });
}

export default class SizedBox extends Component {
  @tracked size = null;
  measure = elementResourceModifier(ElementSize, {
    into: (value) => (this.size = value),
  });

  <template>
    <section {{this.measure}}>
      {{#if this.size}}
        {{this.size.width}} × {{this.size.height}}
      {{else}}
        Measuring…
      {{/if}}
    </section>
  </template>
}
```

### Handle experiment

`elementResource()` returns a modifier paired with a tracked `current` value,
matching the API the Svelte and Vue adapters expose:

```gjs
import Component from "@glimmer/component";
import { elementResource } from "@starbeam/ember/modifier";
import { ElementSize } from "./element-size";

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

## Timing model

- Starbeam reads mirror their cell tags into Glimmer tags. A template, getter,
  `@cached` getter, modifier argument, or helper that reads Starbeam state is
  invalidated by the same Starbeam writes that would invalidate a Starbeam
  subscriber.
- `fromStarbeam()` re-evaluates lazily on the next read after a Starbeam
  invalidation and remains available when a stable explicit bridge object is
  useful.
- `setupResource()` and `elementResourceModifier()` sync once during setup and
  again on each Starbeam-level invalidation, debounced to a microtask.
- `setupService()` instantiates once per Ember owner; the instance is
  finalized when the owner is destroyed.

## Notes

- Starbeam reads can participate in Glimmer autotracking, but Glimmer-owned
  state is not added to Starbeam's subscription graph. If a resource `sync`
  handler depends on Glimmer-owned state, pass that state through an explicit
  Ember boundary so the resource syncs when it changes.
- The package is shipped as a v2 Ember addon, so Embroider's resolver
  redirects internal `@glimmer/*` imports to the single bundled instance in
  `ember-source`. Don't add `@glimmer/*` packages to your app's
  `dependencies` to "fix" resolution — it'll create duplicate validator
  instances and break tag bridging.
