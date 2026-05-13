# @starbeam/service

`@starbeam/service` provides Starbeam's app-scoped service machinery. A
service is a resource blueprint from `@starbeam/resource` that is instantiated
once for an application object and reused by every consumer in that app.

This package is the low-level service kernel used by framework adapters and
runtime integration code. App authors should normally use the service APIs from
their framework adapter instead:

- React: `useService(blueprint)` from `@starbeam/react`.
- Preact: `useService(blueprint)` or `setupService(blueprint)` from
  `@starbeam/preact`.
- Vue: `setupService(blueprint)` from `@starbeam/vue`, with the Starbeam Vue
  plugin installed for app integration.

Use this package directly when you are writing adapter/runtime integration code
or when you intentionally need to wire a Starbeam app object yourself.

## Example

Start with a normal resource blueprint:

```ts
import { Cell } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";

const UserSession = Resource(({ on }) => {
  const user = Cell<{ id: string; name: string } | null>(null);

  const unsubscribe = subscribeToSession((nextUser) => {
    user.current = nextUser;
  });

  on.finalize(() => {
    unsubscribe();
  });

  return {
    get user() {
      return user.current;
    },
  };
});
```

Resolve the resource as an app-scoped service by passing an app object
explicitly:

```ts
import { getServiceFormula, service } from "@starbeam/service";
import { finalize } from "@starbeam/shared";

const app = {};

const session = service(UserSession, { app });
const sameSession = service(UserSession, { app });

session === sameSession; // true

const syncServices = getServiceFormula(app);

// Adapters subscribe to or schedule this formula in their framework timing
// model. Manual integrations may call it directly.
syncServices();

finalize(app); // runs service finalizers for this app
```

If an adapter has already installed the current Starbeam app in `CONTEXT`, the
`app` option can be omitted:

```ts
import { CONTEXT } from "@starbeam/runtime";
import { service } from "@starbeam/service";

const app = {};
CONTEXT.app = app;

const session = service(UserSession);
```

The explicit `app` option is usually clearer in low-level integration code. The
`CONTEXT.app` fallback is the path adapters use while running framework setup
inside a known app.

## API Reference

### `service(resource, options?)`

```ts
function service<T>(
  resource: ResourceBlueprint<T>,
  options?: {
    app?: object;
    description?: string | Description;
  },
): T;
```

Returns the singleton instance for `resource` in the selected app. If the app has
not seen that resource blueprint before, `service()` sets it up inside the app's
finalization scope and returns the resource value. Later calls with the same app
and resource blueprint return the same value.

If `options.app` is omitted, `service()` uses `CONTEXT.app`.

### `getServiceFormula(app)`

```ts
function getServiceFormula(app: object): FormulaFn<void>;
```

Returns the formula that synchronizes services for `app`. Framework adapters use
this formula to connect service synchronization to their scheduler. Manual
integrations can call it directly after creating services and whenever their
integration decides app services should synchronize.

Adding a new service invalidates this formula so the next scheduled run sees the
new service. When a service's own sync function invalidates, the formula runs
that sync function in the app-level service pass.

### `Service(resource, options?)`

```ts
function Service<T>(
  resource: ResourceBlueprint<T>,
  options?: {
    app?: object;
    description?: string | Description;
  },
): ResourceBlueprint<T>;
```

Wraps a resource blueprint as another resource blueprint that resolves through
the selected app. This is a narrow adapter/runtime helper for places that need a
resource-shaped value while still sharing the underlying instance per app. Most
direct consumers should call `service(resource, options?)` instead.

If `options.app` is omitted, `Service()` uses `CONTEXT.app`.

## Semantics

- A service is a singleton per app object and resource blueprint.
- Service setup is tied to the app lifetime, not to the component or caller that
  first requested it.
- Finalizing the app finalizes every service resource created for that app.
- Calling `service()` is synchronous: it returns the service value immediately.
- Starbeam does not choose framework scheduling here. Adapters schedule service
  synchronization in their own framework timing model.
- `getServiceFormula(app)` is the adapter/manual integration point for syncing
  app services.
- `CONTEXT.app` is a fallback for adapter-managed setup contexts. Passing
  `app` explicitly avoids depending on ambient context.

## Non-Goals

- `@starbeam/service` is not exported from `@starbeam/universal` today.
- This package does not define React, Vue, or Preact scheduling semantics.
  Official framework adapters own those APIs.
- This package is not a replacement for app-facing adapter APIs such as
  React `useService`, Preact `useService`/`setupService`, or Vue
  `setupService`.
- This README does not decide the future `@starbeam/universal` umbrella shape.
  That package-surface decision belongs to the next universal umbrella PER.
