# @starbeam/svelte

Experimental Svelte adapter for Starbeam element-backed resources.

This package currently exists to compare Svelte DOM attachment ergonomics. The
stable creator shape is the same one used by the React, Preact, and Vue leaves:

```ts
type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;
```

## Callback sink

```svelte
<script lang="ts">
  import { elementResourceAttachment } from "@starbeam/svelte";
  import { ElementSize } from "./element-size";

  let size = $state<Size | null>(null);

  const attachSize = elementResourceAttachment(ElementSize, {
    into(value) {
      size = value;
    },
  });
</script>

<section {@attach attachSize}>
  {size ? `${size.width} × ${size.height}` : "Measuring…"}
</section>
```

## Store sink

```svelte
<script lang="ts">
  import { elementResourceStore } from "@starbeam/svelte";
  import { ElementSize } from "./element-size";

  const size = elementResourceStore(ElementSize);
</script>

<section {@attach size.attach}>
  {$size ? `${$size.width} × ${$size.height}` : "Measuring…"}
</section>
```

Both forms keep cells private. Consumers read domain-shaped values such as
`size.width`, not `size.width.current`.
