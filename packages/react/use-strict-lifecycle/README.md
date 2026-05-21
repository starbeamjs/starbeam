# @starbeam/use-strict-lifecycle

React lifecycle infrastructure for code that needs a fresh instance when React
re-activates a component.

This package is public, but it is not the normal app-author starting point for
Starbeam. App code should usually start with `@starbeam/react` hooks such as
`useReactive()`, `useResource()`, `useElementResource()`, and `useService()`.

Use this package directly when you are writing React infrastructure or reusable
library code that needs to manage setup, update, layout, idle, and cleanup across
React Strict Mode, Fast Refresh, and hidden/revealed trees.

## Why this exists

React can keep a component instance while running its cleanup and setup work
again. This happens in development Strict Mode and Fast Refresh, and similar
activation/deactivation patterns appear in newer React lifecycle features.

That means infrastructure code cannot treat cleanup as final unmount, and it
cannot assume setup only runs once for a component instance.

`useLifecycle()` gives infrastructure code one place to create an instance,
register lifecycle handlers, clean it up when React deactivates it, and create a
fresh instance when React activates it again.

## Install

```sh
pnpm add @starbeam/use-strict-lifecycle
```

`react`, `react-dom`, and `scheduler` are peer dependencies.

## `useLifecycle()`

`useLifecycle(options).render(build)` creates or returns a lifecycle-managed
instance.

The `build` callback does not run on every render. It runs when the instance is
first created and when React or `validate` forces a rebuild. Per-render work
belongs in lifecycle handlers such as `on.update()`, `on.layout()`, and
`on.idle()`.

```tsx
import { useLifecycle } from "@starbeam/use-strict-lifecycle";

interface TimerHandle {
  readonly startedAt: number;
  label: string;
  current: number;
}

export function useTimer(label: string): TimerHandle {
  return useLifecycle({ props: label }).render(({ on }, initialLabel, prev) => {
    const timer: TimerHandle = prev ?? {
      startedAt: Date.now(),
      label: initialLabel,
      current: Date.now(),
    };

    on.update((currentLabel) => {
      timer.label = currentLabel;
      timer.current = Date.now();
    });

    on.layout((currentLabel) => {
      console.log("attached", currentLabel);
    });

    on.cleanup((currentLabel) => {
      console.log("detached", currentLabel);
    });

    return timer;
  });
}
```

The `build` callback runs during render, but only for initial creation or
rebuild. Keep it to synchronous identity setup and lifecycle handler
registration. Put per-render updates in `update` handlers, and put layout,
passive, or cleanup work in `layout`, `idle`, or `cleanup` handlers. Read current
`props` from the handler argument so handlers do not close over stale render
values.

## Options

| Option     | Use for                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `props`    | Per-render values passed to the build callback and lifecycle handlers.                               |
| `validate` | A value that decides whether the existing instance is still valid.                                   |
| `with`     | Equality function for comparing the current and previous `validate` values. Defaults to `Object.is`. |

When validation fails, `useLifecycle()` runs cleanup, rebuilds the instance, and
runs layout handlers for the new instance.

## Builder API

The build callback receives a `Builder`.

| Builder member        | Use for                                                         |
| --------------------- | --------------------------------------------------------------- |
| `on.update(handler)`  | Run during updates while the component is active.               |
| `on.layout(handler)`  | Run in layout-effect timing after React attaches the component. |
| `on.idle(handler)`    | Run in passive-effect timing.                                   |
| `on.cleanup(handler)` | Run when React deactivates or unmounts the instance.            |
| `notify()`            | Ask React to rerender when the managed instance changes.        |

The build callback also receives the current `props` value and, when available,
the previous instance value. Use `prev` when your infrastructure needs to carry a
selected piece of identity across a rebuild.

## Helper APIs

| API                       | Use for                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `useInstance(blueprint)`  | Small wrapper around `useLifecycle().render(blueprint)`.                     |
| `useLastRenderRef(value)` | Expose the latest render value to lifecycle handlers without stale closures. |

## Starbeam integration helpers

The package also exports helpers used by `@starbeam/react` to enforce Starbeam's
React read rules:

- `isRendering()`;
- `maskRendering()` / `unmaskRendering()`;
- `setupFunction()`;
- `unsafeTrackedElsewhere()`.

These are integration helpers, not normal app APIs. Use them only when building
React infrastructure that needs to participate in Starbeam's read barriers.

## What this package does not do

- It does not bypass React Strict Mode.
- It does not make effects run only once.
- It does not replace `@starbeam/react` for app code.
- It does not decide when a Starbeam resource syncs; framework adapters own that
  scheduling.

## Learn more

- [React guide](https://starbeamjs.com/frameworks/react/): app-facing React APIs.
- [Advanced / implementor docs](https://starbeamjs.com/advanced/overview/): React
  lifecycle and compiler notes.
- [Theory notes](./THEORY.md): implementation background for the lifecycle model.
