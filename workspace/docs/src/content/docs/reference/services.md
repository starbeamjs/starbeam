---
title: Services
description: "Reference for Starbeam service APIs and adapter-facing service helpers."
---

Services are resource-backed state with an app lifetime. Start with
[Services and app lifetime](/concepts/services/) for the concept guide.

App authors usually use service helpers from their framework adapter. The direct
`@starbeam/service` package is for adapter and manual integration code.

## App-facing adapter APIs

| Framework | API                                              | Notes                                                     |
| --------- | ------------------------------------------------ | --------------------------------------------------------- |
| React     | `Starbeam` provider plus `useService(blueprint)` | The provider establishes the app lifetime.                |
| Preact    | `install(options)` plus `useService(blueprint)`  | The installed adapter owns the app lifetime.              |
| Vue       | `Starbeam` plugin plus `setupService(blueprint)` | Install the plugin on the Vue app.                        |
| Svelte    | Not exposed yet                                  | The Svelte adapter does not expose service helpers today. |

## Direct package

```sh
pnpm add @starbeam/service
```

```ts
import { getServiceFormula, service, Service } from "@starbeam/service";
```

## Low-level APIs

| API                           | Use for                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `service(resource, options?)` | Resolve the singleton value for a resource blueprint in an app.    |
| `getServiceFormula(app)`      | Get the formula adapters use to synchronize services for an app.   |
| `Service(resource, options?)` | Wrap a resource blueprint so it resolves through the selected app. |

## Semantics

- A service is a singleton per app object and resource blueprint.
- Service setup is tied to the app lifetime, not the first component that asks
  for it.
- Finalizing the app finalizes services created for that app.
- Framework adapters own scheduling and app integration.

## Related docs

- [Services and app lifetime](/concepts/services/)
- [Resources](/reference/resources/)
- [Framework adapters](/reference/framework-adapters/)
