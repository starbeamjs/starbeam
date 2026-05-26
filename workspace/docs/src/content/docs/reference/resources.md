---
title: Resources
description: "Reference for Starbeam resource authoring APIs."
---

Resources model stable values with setup, sync cleanup, and owning-scope
finalization. Start with [Resources and lifecycle](/concepts/lifecycle/) for the
concept guide.

App code usually imports `Resource` from `@starbeam/universal`. Reusable resource
helpers and manual integrations may import direct APIs from `@starbeam/resource`.

## Common import

```ts
import { Resource } from "@starbeam/universal";
```

## Direct package

```sh
pnpm add @starbeam/resource
```

```ts
import { Resource, ResourceList, setupResource } from "@starbeam/resource";
```

## Authoring APIs

| API                                      | Use for                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Resource(constructor)`                  | Define a resource blueprint.                                                                 |
| `resource.use(childBlueprint)`           | Set up a child resource under the current resource.                                          |
| `resource.on.sync(handler)`              | Register sync work. Returned cleanup runs before the next sync and when the owner finalizes. |
| `resource.on.lowLevel.finalize(handler)` | Register lower-level owning-scope finalization, not ordinary external-work teardown.         |
| `ResourceList(list, options)`            | Keep a keyed list of child resources stable by key.                                          |

## Low-level APIs

| API                        | Use for                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `setupResource(blueprint)` | Manual or adapter-facing resource setup.                             |
| `SyncTo(constructor)`      | Lower-level sync blueprint without child-resource helpers.           |
| `PrimitiveSyncTo(define)`  | Lowest-level setup/sync/finalization primitive for integration code. |

Most app code should use framework adapter APIs such as React/Preact
`useResource()` or Vue `setupResource()` instead of `setupResource()` directly.

## Semantics

- Setup creates the stable value.
- Sync work is scheduled by the caller or framework adapter.
- Sync cleanup is the normal place to stop external work. It runs before the
  next sync and when the owner finalizes.
- Finalizers run when the owning scope finalizes. They are for lower-level scope
  finalization, not for timely teardown of sockets, timers, observers, or
  subscriptions created during setup.
- Child resources sync after their parent.

## Deprecated compatibility

`resource.on.finalize(handler)` is a deprecated alias for
`resource.on.lowLevel.finalize(handler)`. Prefer `resource.on.sync(handler)` and
returned cleanup for ordinary external-work teardown.

## Related docs

- [Resources and lifecycle](/concepts/lifecycle/)
- [Services and app lifetime](/concepts/services/)
- [Element resources and DOM attachment](/concepts/element-resources/)
- [Framework adapters](/reference/framework-adapters/)
