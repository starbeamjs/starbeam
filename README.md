# Starbeam

**Reactivity that stays JavaScript.**

Starbeam lets you mark the root state that changes, then build domain-shaped
functions, classes, getters, methods, and collections around it as ordinary
JavaScript.

Reactive objects and collections keep their JavaScript and TypeScript surface: a
reactive `Map<K, V>` is still a `Map<K, V>`, and a reactive object is still typed
as the object you passed in.

Your public model can look like your app:

- `cart.totalCents`
- `session.userName`
- `size.width`
- `form.isValid`

The reactive boundary stays small. Root state is marked; the rest of the model
stays inspectable JavaScript.

## How the model scales

1. **Mark root state.** Use reactive collections and objects for the values that
   change.
2. **Keep derived state ordinary.** Use functions, getters, methods, and classes
   above root state.
3. **Add lifecycle when work needs it.** Use resources for setup, sync, and
   cleanup; adapters connect resources to framework lifetimes.

## Install

Framework-neutral models usually start with:

```sh
pnpm add @starbeam/universal @starbeam/collections
```

Framework apps add the adapter for the framework that owns rendering:

- `@starbeam/react`
- `@starbeam/preact`
- `@starbeam/vue`
- `@starbeam/svelte`

See [Install Starbeam] for the package chooser.

## Documentation

- [Start]: build a first Starbeam model.
- [Install Starbeam]: choose packages for your app or library.
- [Core concepts]: learn root state, derived reads, resources, and services.
- [Framework guides]: connect Starbeam to React, Preact, Vue, or Svelte.
- [Library-author guide]: write reusable framework-neutral abstractions.
- [Reference]: see the package reference.
- [Advanced docs]: orient to adapter and runtime internals.
- [Experiments]: read about active prototypes.
- [Archive]: identify historical notes.

## Community

- [Documentation][docs]
- [Discord]
- [GitHub](https://github.com/starbeamjs/starbeam)

[docs]: https://starbeamjs.com
[Start]: https://starbeamjs.com/start/introduction/
[Install Starbeam]: https://starbeamjs.com/start/install/
[Core concepts]: https://starbeamjs.com/concepts/overview/
[Framework guides]: https://starbeamjs.com/frameworks/overview/
[Library-author guide]: https://starbeamjs.com/library-authors/overview/
[Reference]: https://starbeamjs.com/reference/overview/
[Advanced docs]: https://starbeamjs.com/advanced/overview/
[Experiments]: https://starbeamjs.com/experiments/overview/
[Archive]: https://starbeamjs.com/archive/overview/
[Discord]: https://discord.gg/HXq3PMmj8A
