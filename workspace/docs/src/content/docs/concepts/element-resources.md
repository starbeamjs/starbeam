---
title: Element resources and DOM attachment
description: "Attach Starbeam resource work to DOM elements supplied by a framework."
---

Element resources model work that needs a DOM element. The framework supplies the
element, Starbeam creates resource-backed work for that element, and cleanup
follows the framework's element lifetime.

That concept is also called DOM attachment: Starbeam attaches resource work to an
element without becoming the framework that owns the DOM.

## The stable shape

An element resource starts with a framework-supplied element and returns a
resource value for your app to read.

```ts
import { reactive } from "@starbeam/collections";
import { Resource } from "@starbeam/universal";

interface Size {
  readonly width: number;
  readonly height: number;
}

export function ElementSize(element: Element) {
  return Resource(({ on }) => {
    const size = reactive.object({ width: 0, height: 0 }) satisfies Size;

    on.sync(() => {
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;

        size.width = entry.contentRect.width;
        size.height = entry.contentRect.height;
      });

      observer.observe(element);
      return () => observer.disconnect();
    });

    const value: Size = size;
    return value;
  });
}
```

`ElementSize` returns a domain-shaped value. Consumers read `size.width`, not
`size.width.current`.

The element belongs to the framework. The observer and cleanup belong to the
resource.

This `ElementSize` definition is framework-neutral. The same element resource can
be used from every supported framework; only the adapter API that delivers the
DOM element changes.

## Framework dialects

Each framework has its own way to deliver DOM elements. Starbeam adapters expose
that framework's native dialect.

| Framework | Element-resource API         | Framework dialect   |
| --------- | ---------------------------- | ------------------- |
| React     | `useElementResource()`       | callback ref        |
| Preact    | `useElementResource()`       | callback ref        |
| Ember     | `elementResourceModifier()`  | modifier            |
| Vue       | `elementResourceDirective()` | custom directive    |
| Svelte    | `elementResource()`          | Svelte 5 attachment |

The resource definition can stay framework-neutral. The adapter owns element
delivery, scheduling, and publication back into the framework.

## React and Preact

React and Preact use callback refs. The hook returns both the ref and the current
attachment state.

```tsx
const size = useElementResource((element: HTMLElement) => ElementSize(element));

return <section ref={size.ref}>{size.status}</section>;
```

The hook owns the element lifetime. When the element is detached, the adapter
finalizes the element resource.

## Vue

Vue uses directives for element-owned work. `elementResourceDirective()` creates a
directive and can publish the resource value into a ref owned by the component.

```ts
const size = shallowRef<Size | null>(null);
const vSize = elementResourceDirective(ElementSize, { into: size });
```

The directive owns the element lifetime. The `into` ref is the handoff from the
directive back to Vue render data.

## Svelte

Svelte 5 uses attachments. `elementResource()` returns a Svelte-readable value
that is also attachable.

```svelte
<script lang="ts">
  const size = elementResource(ElementSize);
</script>

<section {@attach size.attach}>
  {$size ? `${$size.width} × ${$size.height}` : "Measuring…"}
</section>
```

The attachment owns the element lifetime and finalizes the resource when Svelte
detaches the element.

## Adapter-author details

Shared adapter-author setup primitives live below the app-facing concept. Most
app and library code should not need those lower-level integration details.

Use the framework adapter APIs first. Reach for lower-level renderer material only
when you are implementing an adapter or investigating framework integration.

## Next steps

- [Resources and lifecycle](/concepts/lifecycle/): setup, sync, cleanup, and
  finalize.
- [Services](/concepts/services/): app-scoped resource-backed state.
- [Framework guides](/frameworks/overview/): framework-specific element-resource
  syntax.
