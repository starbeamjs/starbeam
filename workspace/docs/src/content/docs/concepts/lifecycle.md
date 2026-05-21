---
title: Resources and lifecycle
description: "How Starbeam resources add setup, sync, and cleanup when reactive work needs a lifetime."
---

A resource is Starbeam's lifecycle abstraction. Use root state for values that
only need to be read and updated. Use a resource when the work itself needs to
start, synchronize, and stop.

That distinction keeps the first idea small:

1. Mark root state.
2. Keep derived state as ordinary JavaScript.
3. Reach for resources when the work has a lifetime.

## Root state does not need an owner

Plain root state is reactive as soon as you create it. There is no app
container, provider, or owner just to make a value reactive.

```ts
import { reactive } from "@starbeam/collections";

const count = reactive.object({ value: 0 });

count.value++;
count.value;
```

The owner appears when the work itself has a lifetime: a timer, subscription,
socket, observer, DOM element, or shared app service.

## Add a resource when work has a lifetime

A resource wraps lifecycle work while returning the same kind of value your app
would otherwise use. If the returned value already has the right shape, return a
reactive object directly.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

export const Clock = Resource(({ on }) => {
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
```

The resource owns the timer and returns the value the app wants to read:
`clock.now`. The first sync sets `clock.now` after the framework owner is ready.
Later timer ticks update the same reactive object.

If the resource needs derived domain values, expose them with ordinary getters
on the returned object.

## Setup, sync, cleanup, finalize

Resources separate the value you return from the work needed to keep that value
connected to the outside world.

- **Setup** creates the stable value the resource returns.
- **Sync** starts or refreshes work after the owner is ready.
- **Sync cleanup** stops work from the previous sync before the next sync runs.
- **Finalize** stops work when the owning lifetime ends.

`on.sync()` registers the sync work. Starbeam runs it when the framework adapter
schedules the resource. If the sync callback returns a function, Starbeam runs
that cleanup before the next sync and again when the owner finalizes.

That is why the timer cleanup belongs inside `on.sync()`: each sync owns the
timer it created.

`on.finalize()` is for cleanup that should run once when the owning lifetime
ends.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

const Connection = Resource(({ on }) => {
  const connection = reactive.object({ status: "connecting" });
  const socket = new WebSocket("wss://example.com");

  socket.addEventListener("open", () => {
    connection.status = "open";
  });

  on.finalize(() => {
    socket.close();
    connection.status = "closed";
  });

  return connection;
});
```

Most app code does not call sync or finalize directly. Framework adapters attach
resources to framework lifetimes and schedule the work for you.

## Framework adapters connect resources to framework lifetimes

The resource definition is framework-neutral. The adapter decides how setup,
sync, cleanup, and finalize fit into the framework that owns the component.

- [React](/frameworks/react/) uses `useResource()`. The resource belongs to the
  React component; sync runs in React effect timing after commit, and finalize
  runs when React unmounts the component.
- [Preact](/frameworks/preact/) uses `useResource()`. The resource belongs to
  the Preact component; sync is scheduled through Preact effects, and finalize
  runs when the component unmounts.
- [Vue](/frameworks/vue/) uses `setupResource()`. The resource is created from
  Vue setup, sync is scheduled through Vue's component lifecycle, and finalize
  runs when Vue unmounts the component.
- [Svelte](/frameworks/svelte/) supports Starbeam reads and element resources
  today. It does not expose component-resource or service helpers yet.

This is the reason the framework guides matter. A resource is portable, but the
owner is framework-specific. The guide for each adapter shows how Starbeam's
resource phases line up with that framework's words for component work.

## Services are app-scoped resources

A service is resource-backed state with an app lifetime. Use services for shared
application concerns that should live with the app or framework root, not with a
single component.

The resource still returns a domain-shaped value. The difference is ownership:
the app owns the service lifetime. See
[Services and app lifetime](/concepts/services/) for the app-facing service
model.

## Element resources attach work to DOM elements

Some resources need a DOM element. Element resources let the framework provide
the element while Starbeam owns the setup, sync, and cleanup work.

The concept stays the same: the element comes from the framework, and the value
you read stays domain-shaped. See
[Element resources and DOM attachment](/concepts/element-resources/) for the
framework dialects and the stable element-resource shape.

## The resource progression

The app-author path is:

1. Mark root state.
2. Keep derived state as ordinary JavaScript.
3. Use a resource when work needs setup, sync, or cleanup.
4. Use a [service](/concepts/services/) when resource-backed state should live
   with the app.
5. Use an [element resource](/concepts/element-resources/) when the resource
   needs a DOM element from a framework.

You do not need a resource for every reactive value. Use one when the work has a
lifetime.

## Next steps

- [Framework guides](/frameworks/overview/): connect resource lifetimes to each
  supported framework.
- [Services and app lifetime](/concepts/services/): app-scoped resource-backed
  state.
- [Element resources and DOM attachment](/concepts/element-resources/): resources
  attached to framework-supplied elements.
- [Reference](/reference/overview/): see the public package surface at a glance.
