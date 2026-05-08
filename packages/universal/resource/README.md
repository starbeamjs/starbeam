# @starbeam/resource

`@starbeam/resource` defines framework-agnostic resources: stable values with a
caller-scheduled sync phase and finalization cleanup.

The primary audience is resource authors and framework-agnostic library authors.
App authors use this package when they are authoring reusable resources. Adapter
authors may use the low-level setup contract, but `@starbeam/renderer` owns the
shared adapter story.

## Quick example

```ts
import { Cell } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";

export const Stopwatch = Resource(({ on }) => {
  const now = Cell(Date.now());

  on.sync(() => {
    const timer = setInterval(() => {
      now.set(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  });

  return {
    get formatted() {
      return new Intl.DateTimeFormat().format(now.current);
    },
  };
});
```

Return domain-shaped values from resources. Keep cells and formulas private, and
expose getters or methods that read them.

## Consuming resources

Framework adapters own component scheduling and finalization. Use the adapter
API for your framework:

- React and Preact: pass a resource blueprint to `useResource()` from the
  framework adapter.
- Vue: pass a resource blueprint to `setupResource()` from `@starbeam/vue`.

The low-level `setupResource()` export from `@starbeam/resource` is for manual
or adapter-facing setup:

```ts
import { setupResource } from "@starbeam/resource";

const { value: stopwatch, sync } = setupResource(Stopwatch);

sync();
stopwatch.formatted;
```

Manual callers must arrange finalization with Starbeam runtime scopes. Most app
code should use a framework adapter instead.

## API reference

### `Resource(constructor)`

Creates a resource blueprint.

```ts
const blueprint = Resource((resource) => {
  resource.on.sync(() => {
    // run in the sync phase
    return () => {
      // cleanup for this sync
    };
  });

  return value;
});
```

The constructor runs during setup and returns the stable resource value. It
receives a resource definition object with `on` hooks and `use()`.

### `resource.use(childBlueprint)`

Sets up a child resource under the current resource and returns the child value.
When the parent syncs, child resources sync after the parent.

### `resource.on.sync(handler)`

Registers the sync handler for the resource. The caller or framework schedules
`sync`; creating a resource does not run sync work by itself.

If the handler returns a cleanup function, Starbeam runs it before the next sync
and when the owning scope finalizes.

### `resource.on.finalize(handler)`

Registers cleanup for the resource's owning scope. Finalizers run when that
scope finalizes.

### `setupResource(intoBlueprint)`

Low-level setup for adapter and manual integration code. It accepts a resource
blueprint or a function that returns one, and returns:

```ts
{
  value: T;
  sync: () => void;
}
```

`value` is stable. `sync` is a reactive formula function that runs the resource
sync phase when called.

### `ResourceList(list, options)`

Creates a keyed list of child resources from an iterable.

```ts
ResourceList(items, {
  key: (item) => item.id,
  map: (item) => ItemResource(item),
});
```

The list resource keeps child resources stable by key, syncs the list shape, and
then syncs the child resources.

### `SyncTo(constructor)`

Creates a lower-level sync blueprint with `on.sync()` and `on.finalize()` but no
child-resource helper. Prefer `Resource()` for resource authoring.

### `PrimitiveSyncTo(define)`

Lowest-level sync primitive. It is useful for integration code that needs to
define setup, sync, optional finalization, and a stable value directly.

## Semantics

- Setup creates the stable resource value.
- Sync work is scheduled by the caller or framework adapter.
- A sync cleanup runs before the next sync and when the owning scope finalizes.
- Child resources created with `resource.use()` sync after the parent resource.
- Finalizers run when the owning scope finalizes.

## What this package does not do

- It does not own React, Preact, or Vue scheduling. Use the framework adapters.
- It does not replace adapter APIs such as React/Preact `useResource()` or Vue
  `setupResource()`.
- It does not provide the old `use(blueprint, { within })` API.
- It does not accept resource metadata objects.
- It does not provide `Resource.withArgs()`.
