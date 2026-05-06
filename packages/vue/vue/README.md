# @starbeam/vue

Vue adapter for Starbeam reactive values, resources, services, and element-backed
resources.

## Public APIs

- `setupReactive(blueprint)`: expose a Starbeam reactive value as a Vue ref.
- `setupResource(blueprint)`: create a Starbeam resource in component setup.
- `setupService(blueprint)`: access an app-scoped Starbeam service.
- `elementResourceDirective(blueprint, options?)`: attach an element-backed
  resource to a Vue custom directive.
- `Starbeam`: Vue plugin that owns app-scoped Starbeam services.

## Element resources

`elementResourceDirective()` is the Vue API for element-backed Starbeam
resources. It accepts a function from an element to a resource blueprint and
returns a Vue custom directive.

Vue directives do not return values to templates, so pass an `into` ref when the
component needs to read the resource value.

```vue
<script setup lang="ts">
import { Cell, Resource } from "@starbeam/universal";
import { elementResourceDirective } from "@starbeam/vue";
import { shallowRef } from "vue";

interface Size {
  readonly width: number;
  readonly height: number;
}

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
    } satisfies Size;
  });
}

const size = shallowRef<Size | null>(null);
const vSize = elementResourceDirective(ElementSize, { into: size });
</script>

<template>
  <section v-size>
    {{ size ? `${size.width} × ${size.height}` : "Measuring…" }}
  </section>
</template>
```

The returned resource value should be domain-shaped. Keep cells private and
expose getters or methods, so consumers read `size.width`, not
`size.width.current`.

## Timing model

The directive creates the element-backed resource when Vue calls `mounted` and
finalizes it when Vue calls `unmounted`.

When `into` is provided:

- before mount, keep the ref initialized to `null`;
- after mount and the initial Starbeam sync, publish the resource value;
- after later Starbeam sync invalidations, trigger the ref so Vue rerenders even
  if the resource value identity is stable;
- on unmount, reset the ref to `null`.
