---
title: Framework adapters
description: "Reference for Starbeam's React, Preact, Ember, Vue, and Svelte adapter surfaces."
---

Framework adapters connect Starbeam reads, resources, services, and element
resources to framework rendering and lifecycle.

Use the guide for your framework for full examples. This page is a quick API map.

## Adapter matrix

| Framework | Read boundary                                 | Resources                          | Services                                         | Element resources                               |
| --------- | --------------------------------------------- | ---------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| React     | `useReactive(compute, bridge?)`               | `useResource(blueprint, bridge?)`  | `Starbeam` plus `useService(blueprint)`          | `useElementResource(build, bridge?)`            |
| Preact    | `install(options)` tracks render reads        | `useResource(blueprint, deps?)`    | `useService(blueprint)`                          | `useElementResource(build, bridge?)`            |
| Ember     | `fromStarbeam(compute, options?)`             | `setupResource(blueprint, parent)` | `setupService(blueprint, owner?)`                | `elementResourceModifier(blueprint, options?)`  |
| Vue       | `useReactive()` or `setupReactive(blueprint)` | `setupResource(blueprint)`         | `Starbeam` plugin plus `setupService(blueprint)` | `elementResourceDirective(blueprint, options?)` |
| Svelte    | `fromStarbeam(compute)`                       | Not exposed yet                    | Not exposed yet                                  | `elementResource(blueprint)`                    |

## React

Package: `@starbeam/react`

| API                                                   | Use for                                                   |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `Starbeam`                                            | Establish app lifetime for React services.                |
| `useReactive(compute, bridge?)`                       | Read Starbeam-backed values at the React render boundary. |
| `useResource(blueprint, bridge?)`                     | Attach a resource to a React component lifetime.          |
| `useElementResource(build, bridge?)`                  | Attach element-backed resource work to a callback ref.    |
| `useService(blueprint)`                               | Resolve app-scoped service state.                         |
| `useSetup(setup)` / `useProp(variable, description?)` | Lower-level setup helpers.                                |

Use `bridge` for changing non-Starbeam values captured by the callback. Omit it
when there is nothing to bridge.

## Preact

Package: `@starbeam/preact`

| API                                     | Use for                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `install(options)`                      | Install Starbeam into Preact render/lifecycle hooks.       |
| `useResource(blueprint, deps?)`         | Attach a resource to a Preact component lifetime.          |
| `useElementResource(build, bridge?)`    | Attach element-backed resource work to a callback ref.     |
| `useService(blueprint)`                 | Resolve app-scoped service state under the installed root. |
| `useReactive` / `setup*` / `createCell` | Lower-level APIs, not the main Preact path.                |

After `install(options)`, direct render reads are the main Preact output boundary.

## Ember

Package: `@starbeam/ember`

The Ember adapter is experimental and ships as a v2 Ember addon. Its read bridge
uses Glimmer tags: Ember templates, `@cached` getters, helpers, and modifiers see
Starbeam invalidations when the read goes through `fromStarbeam()`.

| API                                                       | Use for                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| `fromStarbeam(compute, options?)`                         | Bridge a Starbeam read into Glimmer autotracking.                |
| `setupResource(blueprint, parent)`                        | Attach a resource to an Ember destroyable.                       |
| `setupReactiveResource(blueprint, parent)`                | Lower-level resource setup with an autotracked `current` getter. |
| `setupService(blueprint, owner?)` / `useService()`        | Resolve owner-scoped service state.                              |
| `resource(blueprint)` / `useResource()` / `getResource()` | Lower-level helper-manager resource integration.                 |
| `elementResourceModifier(blueprint, options?)`            | Attach element-backed work to an Ember modifier.                 |
| `elementResource(blueprint)`                              | Experimental modifier plus autotracked `current` handle.         |

Use `fromStarbeam()` for template-facing reads. A raw template read of a
Starbeam-backed getter can compute during a render Ember already scheduled, but
it does not subscribe to Starbeam invalidations by itself.

## Vue

Package: `@starbeam/vue`

| API                                             | Use for                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `Starbeam`                                      | Vue plugin for app-scoped service ownership.                     |
| `useReactive()`                                 | Make direct Starbeam reads visible to the current Vue component. |
| `setupReactive(blueprint)`                      | Expose a Starbeam read as a Vue ref.                             |
| `setupResource(blueprint)`                      | Attach a resource to Vue component setup/lifecycle.              |
| `setupService(blueprint)`                       | Resolve app-scoped service state.                                |
| `elementResourceDirective(blueprint, options?)` | Attach element-backed work to a Vue directive.                   |
| `elementResource(blueprint)`                    | Experimental lower-level handle with a directive and ref.        |

## Svelte

Package: `@starbeam/svelte`

| API                                              | Use for                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `fromStarbeam(compute)`                          | Experimental Svelte 5 read bridge for templates, `$derived`, and effects. |
| `elementResource(blueprint)`                     | Primary Svelte 5 attachment API.                                          |
| `elementResourceStore(blueprint)`                | Explicit store-shaped spelling.                                           |
| `elementResourceAttachment(blueprint, options?)` | Lower-level attachment sink.                                              |

The Svelte adapter does not expose component-resource or service helpers yet.
Deeper integration is tracked in
[starbeamjs/starbeam#261](https://github.com/starbeamjs/starbeam/issues/261).

## Related docs

- [React guide](/frameworks/react/)
- [Preact guide](/frameworks/preact/)
- [Ember guide](/frameworks/ember/)
- [Vue guide](/frameworks/vue/)
- [Svelte guide](/frameworks/svelte/)
- [Resources](/reference/resources/)
- [Services](/reference/services/)
- [Element resources and DOM attachment](/concepts/element-resources/)
