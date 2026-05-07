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

## Element resource

```svelte
<script lang="ts">
  import { elementResource } from "@starbeam/svelte";
  import { ElementSize } from "./element-size";

  const size = elementResource(ElementSize);
</script>

<section {@attach size.attach}>
  {$size ? `${$size.width} × ${$size.height}` : "Measuring…"}
</section>
```

`elementResource()` returns one Svelte-readable object that is also attachable.
Attach it with `size.attach`; read the published value with Svelte's store
syntax.

## Store sink

`elementResourceStore()` is the explicit store-shaped spelling. It returns the
same attachable/readable shape as `elementResource()`.

```ts
const size = elementResourceStore(ElementSize);
```

Both forms keep cells private. Consumers read domain-shaped values through
Svelte's store syntax, such as `$size.width`, not `$size.width.current`.
