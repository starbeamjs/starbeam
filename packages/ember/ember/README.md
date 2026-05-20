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
import { fromStarbeam } from "@starbeam/ember";
import { cart } from "./cart";

export default class CartTotal extends Component {
  total = fromStarbeam(() => cart.totalCents, { parent: this });

  <template>
    <p>{{this.total.current}}</p>
  </template>
}
```

`fromStarbeam()` returns a read-only `current` getter. Keep Starbeam cells and
collections private inside your domain objects; expose domain-shaped getters and
wrap those reads at the Ember boundary.

Pass `options.parent` to tie the subscription to a destroyable (component,
modifier, helper, owner). Without `parent`, the caller must invoke
`disconnect()` to release the subscription.

## Resources

`setupResource()` creates a Starbeam resource and ties its lifetime to a
destroyable parent — typically the component using it. To make the resource's
value reactive from inside templates, wrap reads with `fromStarbeam` so Ember's
autotracker can observe them:

```gjs
import Component from "@glimmer/component";
import { fromStarbeam, setupResource } from "@starbeam/ember";
import { Stopwatch } from "./stopwatch";

export default class Clock extends Component {
  stopwatch = setupResource(Stopwatch, this);
  time = fromStarbeam(() => this.stopwatch.time, { parent: this });

  <template>
    <p>{{this.time.current}}</p>
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
import { fromStarbeam, setupService } from "@starbeam/ember";
import { Session } from "./session";

export default class Header extends Component {
  session = setupService(Session, getOwner(this));
  name = fromStarbeam(() => this.session.user.name, { parent: this });

  <template>
    <span>{{this.name.current}}</span>
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

- `fromStarbeam()` re-evaluates lazily on the next read after a Starbeam
  invalidation. The invalidation dirties an internal Glimmer tag so Ember
  rerenders any consumer that read `current`.
- `setupResource()` and `elementResourceModifier()` sync once during setup and
  again on each Starbeam-level invalidation, debounced to a microtask.
- `setupService()` instantiates once per Ember owner; the instance is
  finalized when the owner is destroyed.

## Notes

- `fromStarbeam()` is the read-bridge: templates and `@cached` getters only
  see Starbeam reactivity through it. If you have a Starbeam cell that you
  want a template to follow, wrap it with `fromStarbeam` (or expose the
  read through `setupResource` and wrap that).
- The package is shipped as a v2 Ember addon, so Embroider's resolver
  redirects internal `@glimmer/*` imports to the single bundled instance in
  `ember-source`. Don't add `@glimmer/*` packages to your app's
  `dependencies` to "fix" resolution — it'll create duplicate validator
  instances and break tag bridging.
