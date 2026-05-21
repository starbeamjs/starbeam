---
title: Resources
description: "Reference for Starbeam resource authoring APIs."
---

Resources model stable values with setup, sync, cleanup, and finalization. Start
with [Resources and lifecycle](/concepts/lifecycle/) for the concept guide.

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

| API                             | Use for                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Resource(constructor)`         | Define a resource blueprint.                                                                         |
| `resource.use(childBlueprint)`  | Set up a child resource under the current resource.                                                  |
| `resource.on.sync(handler)`     | Register sync work. Cleanup returned from the handler runs before the next sync and on finalization. |
| `resource.on.finalize(handler)` | Register cleanup that runs when the resource scope finalizes.                                        |
| `ResourceList(list, options)`   | Keep a keyed list of child resources stable by key.                                                  |

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
- Sync cleanup runs before the next sync and when the owner finalizes.
- Finalizers run when the owning scope finalizes.
- Child resources sync after their parent.

## Related docs

- [Resources and lifecycle](/concepts/lifecycle/)
- [Services and app lifetime](/concepts/services/)
- [Element resources and DOM attachment](/concepts/element-resources/)
- [Framework adapters](/reference/framework-adapters/)
