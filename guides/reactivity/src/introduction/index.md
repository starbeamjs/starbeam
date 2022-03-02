# Starbeam Reactivity

Starbeam Reactivity is a system for defining universal hooks: encapsulated parts of a
reactive program that efficiently update and work harmoniously with any reactive framework.

## What is Starbeam Reactivity?

- [Data Land](./dataland.md)
- [Reactive Values and Computations](./computations.md)
- [Structured Finalization](./teardown.md)

## Universal

Starbeam is a write-once, integrate-anywhere library.

When you write code using `@starbeam/core` APIs, you can integrate them into any
reactive framework with the `ReactiveSubscription` API.

Starbeam also comes with adapters for React (`@starbeam/react`), Vue
(`@starbeam/vue`), Svelte (`@starbeam/svelte`) and Ember (`@starbeam/glimmer`).

**These adapters use the [ReactiveSubscription] API under the hood** to expose
idiomatic entry points for each framework.

## Harmonious

You can use Starbeam in a targeted part of an existing app without needing to
change anything else.

Starbeam hooks are self-contained, and interact with your framework in a clear,
structured way.

That said, when you use multiple Starbeam hooks in a single app, Starbeam
coordinates with your framework to avoid duplicate work.

[reactivesubscription]: ../digging-in/reactive-subscription.md

## Structured Data Flow

> Real World -> Hooks (lifetime) -> [Data Land] -> Subscribers (exfiltrating) -> Real World -> browser task or microtask -> repeat

- ResizeObserver
- setInterval
- MousePosition

### Data Land

> If you remove everything around data land, it makes sense as "Just JS"
