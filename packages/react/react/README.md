# `@starbeam/react`

React bindings for Starbeam.

## Public hooks

- `useReactive(compute, bridge?)`: read Starbeam reactive values during React render.
- `useResource(blueprint, bridge?)`: create a Starbeam resource with React lifecycle.
- `useElementResource(build, bridge?)`: attach an element-backed resource to a React ref.
- `useService(blueprint)`: resolve an app-scoped Starbeam service.
- `useSetup(setup)`: low-level setup hook for adapter/resource integration.
- `useProp(variable, description?)`: store a React prop in a Starbeam cell.

Use the optional `bridge` argument when the callback captures non-reactive
values that can change across renders, such as props, state, route params, or a
`useElementResource()` result. Starbeam reactive values do not need to be listed
in `bridge`; Starbeam tracks them directly.

`bridge` is a non-empty tuple. If there is nothing to bridge, omit the argument
instead of passing `[]`.

## Element resources

`useElementResource()` is the React API for element-backed Starbeam resources.
It handles React's callback ref timing and gives the resource a real DOM element
only after React has created it.

This API is intentionally hook-facing rather than a direct
`setupElementResource()` export. React delivers the element after render through
a callback ref. Public React integration points that call hooks need `use*`
names so React Compiler preserves them as hooks. The shared contract is still
the element resource blueprint you pass to the hook.

The hook returns a discriminated result:

- `pending`: React has not supplied the element yet.
- `attached`: React supplied the element, and the Starbeam resource is available
  as `current`.

The result always includes a stable `ref` to put on the element.

```tsx
import { useElementResource, useReactive } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";

function ElementSize(element: Element) {
  return Resource(({ on }) => {
    const width = Cell(0);
    const height = Cell(0);

    on.sync(() => {
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;

        width.set(entry.contentRect.width);
        height.set(entry.contentRect.height);
      });

      observer.observe(element);

      return () => observer.disconnect();
    });

    return {
      get width() {
        return width.current;
      },

      get height() {
        return height.current;
      },
    };
  });
}

export function MeasuredPanel() {
  const size = useElementResource((element: HTMLDivElement) =>
    ElementSize(element),
  );

  const label = useReactive(() => {
    if (size.status === "pending") {
      return "Measuring…";
    }

    return `${size.current.width} × ${size.current.height}`;
  }, [size]);

  return <section ref={size.ref}>{label}</section>;
}
```

### Timing model

React supplies refs after render. That means an element-backed resource starts as
`pending`, then becomes `attached` after React calls the callback ref and the
component rerenders.

Once the resource is attached, its first `on.sync` handler runs in React passive
effect timing. Later Starbeam invalidations of values read by `on.sync` schedule
future syncs. Plain rerenders do not resync by themselves.

Finalizers registered by the element-backed resource run when the attachment
lifetime ends.

## Historical modifier names

Older Starbeam notes may mention `useReactiveElement`, `ref`, or `useModifier`.
Those names are historical. The current React API for the same public concept is
`useElementResource()`.
