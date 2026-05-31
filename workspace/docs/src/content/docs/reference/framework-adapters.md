---
title: Framework adapters
description: "Reference for Starbeam's React, Preact, Vue, Svelte, and Ember adapter surfaces."
---

Framework adapters connect Starbeam reads, resources, services, and element
resources to framework rendering and lifecycle.

Use the guide for your framework for full examples. This page is a quick API map.

## Adapter matrix

| Framework | Read boundary                                 | Resources                          | Services                                         | Element resources                               |
| --------- | --------------------------------------------- | ---------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| React     | `useReactive(compute, bridge?)`               | `useResource(blueprint, bridge?)`  | `Starbeam` plus `useService(blueprint)`          | `useElementResource(build, bridge?)`            |
| Preact    | `install(options)` tracks render reads        | `useResource(blueprint, deps?)`    | `useService(blueprint)`                          | `useElementResource(build, bridge?)`            |
| Ember     | Glimmer autotracking sees Starbeam reads      | `setupResource(blueprint, parent)` | `setupService(blueprint, owner?)`                | `elementResourceModifier(blueprint, options?)`  |
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

## Ember

Package: `@starbeam/ember`

| API                                            | Use for                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Native Glimmer tag mirror                      | Make Starbeam reads visible to Ember templates and getters.    |
| `fromStarbeam(compute, options?)`              | Explicit read bridge object with `current` and `disconnect()`. |
| `setupResource(blueprint, parent)`             | Attach a resource to an Ember destroyable lifetime.            |
| `setupReactiveResource(blueprint, parent)`     | Explicit `current` wrapper for a resource value.               |
| `setupService(blueprint, owner?)`              | Resolve owner-scoped service state.                            |
| `useResource(parent, blueprint)` / `resource`  | Helper-backed resource setup.                                  |
| `elementResourceModifier(blueprint, options?)` | Attach element-backed work to an Ember modifier.               |
| `elementResource(blueprint)`                   | Handle pairing a modifier with a tracked `current` value.      |

Plain templates and getters can read Starbeam-backed domain objects directly.
Use `fromStarbeam()` when a stable explicit bridge object is useful.

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
