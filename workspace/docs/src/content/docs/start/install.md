---
title: Install Starbeam
description: "Choose the Starbeam packages to install for framework apps, framework-neutral models, and reusable libraries."
---

Install the packages you import directly. Most apps need one framework adapter,
`@starbeam/universal`, and `@starbeam/collections`.

## What are you building?

| If you are building…      | Install…                                                     | Start with…                                                                            |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| A framework-neutral model | `@starbeam/universal @starbeam/collections`                  | `reactive` collections, domain objects, and `Resource`                                 |
| A React app               | `@starbeam/react @starbeam/universal @starbeam/collections`  | `useReactive()`, `useResource()`, `useService()`, `useElementResource()`               |
| A Preact app              | `@starbeam/preact @starbeam/universal @starbeam/collections` | `install(options)`, direct render reads, resource/service hooks                        |
| A Vue app                 | `@starbeam/vue @starbeam/universal @starbeam/collections`    | `useReactive()`, `setupResource()`, `setupService()`, element-resource directives      |
| A Svelte app              | `@starbeam/svelte @starbeam/universal @starbeam/collections` | current Svelte 5 slice: experimental `fromStarbeam()` and element-resource attachments |
| A reusable library        | `@starbeam/universal @starbeam/collections`                  | framework-neutral state and domain-shaped APIs                                         |

## Framework-neutral state

Use this when you are writing a model that is not tied to one UI framework.

```sh
pnpm add @starbeam/universal @starbeam/collections
```

Import collection-shaped root state from `@starbeam/collections`:

```ts
import { reactive } from "@starbeam/collections";
```

Import lifecycle APIs from `@starbeam/universal` when work needs setup, sync, or
cleanup:

```ts
import { Resource } from "@starbeam/universal";
```

Most app models start here: mark the storage that changes, then expose ordinary
JavaScript above it.

## Framework apps

Add the adapter for the framework that owns rendering.

### React

```sh
pnpm add @starbeam/react @starbeam/universal @starbeam/collections
```

```ts
import {
  Starbeam,
  useElementResource,
  useReactive,
  useResource,
  useService,
} from "@starbeam/react";
```

Use the React guide for the bridge argument, resources, services, and element
resources: [React](/frameworks/react/).

### Preact

```sh
pnpm add @starbeam/preact @starbeam/universal @starbeam/collections
```

```ts
import {
  install,
  useElementResource,
  useResource,
  useService,
} from "@starbeam/preact";
```

Install Starbeam into Preact `options`, then ordinary render reads are tracked by
the adapter: [Preact](/frameworks/preact/).

### Vue

```sh
pnpm add @starbeam/vue @starbeam/universal @starbeam/collections
```

```ts
import {
  Starbeam,
  elementResourceDirective,
  useReactive,
  setupReactive,
  setupResource,
  setupService,
} from "@starbeam/vue";
```

Vue uses `useReactive()` for direct template reads, `setupReactive()` when you
want a specific Starbeam read as a Vue ref, and directives for element resources:
[Vue](/frameworks/vue/).

### Svelte

```sh
pnpm add @starbeam/svelte @starbeam/universal @starbeam/collections
```

```ts
import {
  elementResource,
  elementResourceAttachment,
  elementResourceStore,
  fromStarbeam,
} from "@starbeam/svelte";
```

Svelte currently exposes experimental Starbeam reads through `fromStarbeam()` and
DOM element resources through Svelte 5 attachments. Component-resource and
app-service helpers are not exposed yet. See [Svelte](/frameworks/svelte/).

## Direct packages

Most app code should start with the packages above. Reach for direct packages
when you are writing reusable libraries or adapter-level integration code.

If your library only exposes ordinary Starbeam-backed objects, start with the
same framework-neutral install:

```sh
pnpm add @starbeam/universal @starbeam/collections
```

Add direct packages only when your library needs their lower-level APIs.

### `@starbeam/resource`

Use `@starbeam/resource` directly when you are authoring reusable resource
helpers or doing manual resource integration. App code usually imports
`Resource` from `@starbeam/universal` or consumes resources through a framework
adapter.

### `@starbeam/service`

`@starbeam/service` is the lower-level app-scoped service kernel. App authors
usually use framework adapter helpers instead:

- React and Preact: `useService()`;
- Vue: `setupService()`; install the Starbeam plugin when you want to establish
  app ownership explicitly;
- Svelte: service helpers are not exposed yet.

See [Services and app lifetime](/concepts/services/) for the app-facing model.

### `@starbeam/reactive`

Use `@starbeam/reactive` directly when you are building lower-level reactive
primitives. App and library models usually start with `@starbeam/collections`,
`@starbeam/universal`, or a framework adapter.

### `@starbeam/core`

Do not start new code with `@starbeam/core`. It is a deprecated compatibility
alias for `@starbeam/universal`. Existing users can follow the
[core compatibility migration](/reference/core-compatibility/).

## Next steps

- [Start with root state](/start/introduction/): build a first Starbeam model.
- [Core concepts](/concepts/overview/): learn the framework-neutral model.
- [Framework guides](/frameworks/overview/): connect the model to your UI
  framework.
- [Reference](/reference/overview/): see the public package surface at a glance.
