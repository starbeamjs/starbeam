---
title: Services and app lifetime
description: "Use services when resource-backed state should live with the app instead of one component."
---

A service is resource-backed state with an app lifetime. Use a service when the
state belongs to the application as a whole, not to the component that first asks
for it.

Services follow the same progression as the rest of Starbeam:

1. Define ordinary reactive state.
2. Wrap setup, sync, or cleanup in a `Resource` when the work has a lifetime.
3. Let the framework adapter attach that resource to the app lifetime.

## Services are app-scoped resources

A resource belongs to the owner that sets it up. In a component, that owner is
usually the component. A service uses the same resource model, but the owner is
the app.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

export const SessionService = Resource(() => {
  return reactive.object({ userName: "Guest" });
});
```

The returned value stays domain-shaped. Consumers read `session.userName`, not a
reactive-storage wrapper.

This definition is framework-neutral. The same `SessionService` resource can be
used from every supported adapter that exposes service helpers; only the adapter
API that attaches it to the app changes.

## The first reader does not own the service

A service is shared by every consumer in the same app. The first component that
asks for the service may cause it to be created, but that component does not own
its lifetime.

That distinction matters for shared state such as:

- session and account state;
- current workspace or organization state;
- app-wide feature or configuration state;
- shared resource-backed subscriptions.

Use component resources for state that should start and stop with one component.
Use services for resource-backed state that should live with the framework root.

## Adapter APIs

Use the service API from the framework adapter that owns your app.

| Framework | App-facing service API                  | Notes                                                                |
| --------- | --------------------------------------- | -------------------------------------------------------------------- |
| React     | `Starbeam` provider plus `useService()` | The provider establishes the app lifetime.                           |
| Preact    | `install(options)` plus `useService()`  | The installed adapter owns the app lifetime.                         |
| Vue       | `Starbeam` plugin plus `setupService()` | Install the plugin on the Vue app.                                   |
| Svelte    | Not exposed yet                         | The Svelte adapter does not expose app-scoped service helpers today. |

For example, React establishes the app lifetime with `Starbeam`, then components
read the service with `useService()`:

```tsx
import { Starbeam, useReactive, useService } from "@starbeam/react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <Starbeam>
    <CurrentUser />
  </Starbeam>,
);

function CurrentUser(): React.ReactElement {
  const session = useService(SessionService);
  const userName = useReactive(() => session.userName);

  return <p>{userName}</p>;
}
```

Each framework guide shows the native app setup and read boundary for that
framework.

## Lower-level service APIs

Starbeam also has lower-level app-scoped service APIs for adapters and
integration code. Most app code should not import them directly.

If you are writing an adapter or manual runtime integration, use the package
README and reference material for the lower-level APIs. App authors should start
with the adapter helpers above.

## Services and lifecycle

Services do not replace resources. They choose a different owner for a resource.

- Use [Resources and lifecycle](/concepts/lifecycle/) to model setup, sync, and
  cleanup.
- Use services when that resource-backed state should live with the app.
- Use [Element resources](/concepts/element-resources/) when the resource needs a
  DOM element from a framework.

## Next steps

- [React](/frameworks/react/), [Preact](/frameworks/preact/), and
  [Vue](/frameworks/vue/) show current service APIs.
- [Svelte](/frameworks/svelte/) documents the current Svelte adapter scope.
- [Reference](/reference/overview/) maps the package surface.
