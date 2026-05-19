# @starbeam/svelte

Svelte adapter for Starbeam reactive reads and element-backed resources.

## Reactive reads

> Experimental: `fromStarbeam()` is the current tested Svelte 5 read bridge.
> We are investigating deeper integration so Svelte can see Starbeam reads with
> fewer explicit output boundaries. Track that work in
> [starbeamjs/starbeam#261](https://github.com/starbeamjs/starbeam/issues/261).

Use `fromStarbeam()` to expose a Starbeam read to Svelte 5 templates,
`$derived`, and effects:

```svelte
<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";

  const total = fromStarbeam(() => cart.totalCents);
</script>

<p>{total.current}</p>
```

`fromStarbeam()` returns a readonly `current` getter. Keep Starbeam cells and
collections private inside your domain objects; expose domain-shaped getters and
wrap those reads at the Svelte boundary.

`elementResource()` is the primary authoring API for Svelte 5 attachments. It
returns one Svelte-readable object that is also attachable. Attach it with
`size.attach`; read the published value with Svelte's store syntax.

The stable creator shape is the same one used by the React, Preact, and Vue
leaves:

```ts
type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;
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

## Store sink

`elementResourceStore()` is the explicit store-shaped spelling. It returns the
same attachable/readable shape as `elementResource()`.

```ts
const size = elementResourceStore(ElementSize);
```

## Attachment sink

`elementResourceAttachment()` is the lower-level attachment spelling. Use it when
you want to publish the resource value into state that you own.

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

All forms keep cells private. `elementResource()` and `elementResourceStore()`
read domain-shaped values through Svelte's store syntax, such as `$size.width`,
not `$size.width.current`. `elementResourceAttachment()` publishes the same
domain-shaped value into state the author owns.
