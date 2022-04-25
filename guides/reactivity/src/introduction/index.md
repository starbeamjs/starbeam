# Starbeam Reactivity

Starbeam is a library for building reactive data systems that integrate natively
with UI frameworks such as React, Vue, Svelte or Ember.

It interoperates natively with React state management patterns, Svelte stores,
the Vue composition API, and Ember's auto-tracking system.

## What is Starbeam Reactivity?

- [Data Universe](./data-universe.md)
- [Reactive Values and Computations](./computations.md)
- [Structured Finalization](./teardown.md)

## Universal

Starbeam is a write-once, integrate-anywhere library.

When you write code using `@starbeam/core` APIs, you can integrate them into any
reactive framework with the `subscribe` API.

Starbeam also comes with adapters for React (`@starbeam/react`), Vue
(`@starbeam/vue`), Svelte (`@starbeam/svelte`) and Ember (`@starbeam/glimmer`).

**These adapters use the [subscribe] API under the hood** to expose
idiomatic entry points for each framework.

[subscribe]: ../digging-in

## Integrates Natively

You can use Starbeam in a targeted part of an existing app without needing to
change anything else.

Starbeam resources are self-contained, and interact with your framework in a clear,
structured way.

That said, when you use multiple Starbeam resources in a single app, Starbeam
coordinates with your framework to avoid duplicate work.

## Structured Data Flow

> Real World -> Hooks (lifetime) -> [Data Land] -> Subscribers (exfiltrating) -> Real World -> browser task or microtask -> repeat

- ResizeObserver
- setInterval
- MousePosition

### Data Land

> If you remove everything around data land, it makes sense as "Just JS"
