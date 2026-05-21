---
title: Collections
description: "Reference for @starbeam/collections helpers."
---

`@starbeam/collections` defines reactive versions of ordinary JavaScript objects
and built-in collections. Use it for collection-shaped and object-shaped root
state.

For the concept guide, start with [Collections and objects](/concepts/collections/).

## Install

```sh
pnpm add @starbeam/collections
```

```ts
import { reactive } from "@starbeam/collections";
```

## Recommended helpers

| Helper                      | Returns         | Use for                                  |
| --------------------------- | --------------- | ---------------------------------------- |
| `reactive.Map<K, V>()`      | `Map<K, V>`     | keyed records, registries, caches, carts |
| `reactive.Set<T>()`         | `Set<T>`        | membership, selections, tags             |
| `reactive.array<T>(values)` | `T[]`           | ordered list state                       |
| `reactive.object<T>(value)` | `T`             | object-shaped state                      |
| `reactive.WeakMap<K, V>()`  | `WeakMap<K, V>` | object-keyed storage with weak ownership |
| `reactive.WeakSet<T>()`     | `WeakSet<T>`    | weak object membership                   |

`reactive.Map()` and `reactive.Set()` create empty collections. Add entries with
the normal JavaScript APIs.

`reactive.object()` and `reactive.array()` wrap an initial object or array and
return the same JavaScript/TypeScript surface.

## Notes

- Prefer the named `reactive` import in user-facing examples.
- Keep reactive storage private inside domain objects when the collection is an
  implementation detail.
- Use [Resources and lifecycle](/concepts/lifecycle/) when the work has setup,
  sync, cleanup, or finalization.

## Related docs

- [Collections and objects](/concepts/collections/)
- [Start with root state](/start/introduction/)
- [Library-author guide](/library-authors/overview/)
