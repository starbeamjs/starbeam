# DOM Attachment Ergonomics Review

This is the review record after the React, Preact, Vue, and Svelte DOM
attachment probes.

## Status

This review records API evidence. It does not add a new implementation, rename
adapter APIs, or promote `@starbeam/modifier` as a public package.

The current hypothesis is:

- DOM attachment is a public Starbeam concept.
- Official adapters should expose idiomatic host-framework leaves.
- The shared creator shape is stable.
- The returned value should be domain-shaped.
- Modifier-shaped ergonomics are the direction to test next.
- The old `@starbeam/modifier` package name is not the source of truth.

## Stable creator shape

Every successful adapter probe uses the same creator shape:

```ts
type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;
```

A framework supplies an element. Starbeam creates resource-backed work for that
element. Cleanup follows the framework's element lifetime.

The produced value should be domain-shaped, not storage-shaped. A size resource
should publish `size.width` and `size.height`, not `size.width.current` and
`size.height.current`. The public storage boundary is described in
[Starbeam Invariants](./INVARIANTS.md#public-apis-expose-domain-concepts-not-reactive-storage).

## Framework evidence

### React and Preact

React and Preact prove the callback-ref dialect.

`useElementResource()` returns a discriminated result with a stable `ref` and a
`pending | attached` state. `pending` means the framework has not supplied the
element. `attached` means Starbeam has created the element-backed resource value.

This is idiomatic for React and Preact because the same value can carry the ref
and the readable result:

```tsx
const size = useElementResource((element: HTMLDivElement) =>
  ElementSize(element),
);

return (
  <section ref={size.ref}>
    {size.status === "attached" ? size.current.width : "Measuring…"}
  </section>
);
```

The `.current` here is the adapter's attached-result slot. The resource value
inside that slot should still be domain-shaped.

### Vue directive

Vue proves directive-owned lifetime.

`elementResourceDirective()` creates the resource when Vue calls `mounted`,
schedules Starbeam sync through Vue timing, and finalizes the resource when Vue
calls `unmounted`.

Vue directives do not return values to templates, so the public directive API
uses explicit publication when the component needs to read the resource value:

```ts
const size = shallowRef<Size | null>(null);
const vSize = elementResourceDirective(ElementSize, { into: size });
```

This is mechanically clear: `vSize` is the directive and `size` is the readable
Vue ref. The cost is that the author has to name and connect two values.

### Vue element resource

`elementResource()` returns a Vue ref augmented with the directive:

```ts
const size = elementResource(ElementSize);
const vSize = size.directive;
```

That mirrors the modifier-shaped idea: one object is both attachable and
readable, even though Vue template syntax still needs a directive alias.
The handle spelling is still experimental.

Current tests cover directive lifetime and script/render-function reads through
Vue's ref slot:

```ts
size.value ? `width=${size.value.width}` : "pending";
```

Template `size.width` relies on Vue's standard top-level ref unwrapping:

```vue
{{ size ? size.width : "Measuring…" }}
```

### Svelte callback sink

Svelte proves attachment-owned lifetime with `{@attach ...}`.

`elementResourceAttachment()` returns an attachment function. The callback-sink
form publishes the resource value into author-owned state:

```svelte
<script lang="ts">
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

This is the lower-level Svelte attachment form. It matches Svelte runes well
enough to prove the lifecycle, but it has the same split as Vue's `into` form:
one value attaches, another value is read.

### Svelte element resource

`elementResource()` is the primary Svelte authoring API for the current Svelte 5
attachment path:

```svelte
<script lang="ts">
  const size = elementResource(ElementSize);
</script>

<section {@attach size.attach}>
  {$size ? `${$size.width} × ${$size.height}` : "Measuring…"}
</section>
```

The same object is attachable through `size.attach` and readable through
Svelte's store syntax. `elementResourceStore()` remains available as the
explicit store-shaped spelling, and `elementResourceAttachment()` remains the
lower-level attachment/callback-sink primitive. Future Svelte-specific
ergonomics may still be revisited, but the current supported authoring shape is
`elementResource()`.

## Ergonomic comparison

| Adapter shape                         | Element delivery        | Readable value                       | Pending state          | Cleanup             | Friction                                          |
| ------------------------------------- | ----------------------- | ------------------------------------ | ---------------------- | ------------------- | ------------------------------------------------- |
| React / Preact `useElementResource()` | callback ref            | `size.current` when `attached`       | `status === "pending"` | ref lifetime        | Hook-only shape; `.current` is an adapter slot    |
| Vue `elementResourceDirective()`      | custom directive        | separate Vue ref                     | `null`                 | directive lifetime  | explicit `into` wiring                            |
| Vue `elementResource()`               | custom directive alias  | template `size`, script `size.value` | `null`                 | directive lifetime  | still needs a directive alias                     |
| Svelte callback sink                  | `{@attach ...}`         | author-owned `$state`                | `null`                 | attachment lifetime | split attach/read values                          |
| Svelte `elementResource()`            | `{@attach size.attach}` | `$size`                              | `null`                 | attachment lifetime | store syntax may not be the final rune-native API |

## API direction

The first Vue/Svelte modifier-shaped experiments have landed. Svelte now exposes
a readable store augmented with `attach`, and Vue exposes a Vue ref augmented
with `directive`. Vue and Svelte also share `@starbeam/renderer`'s
`setupElementResource()` primitive for the framework-neutral setup and
finalization path.

For now:

- Keep official adapter leaves public and adapter-local.
- Use the shared `ElementResourceBlueprint<E, T>` creator shape.
- Keep returned values domain-shaped.
- Treat refs, directives, and attachments as framework dialects for delivering
  the element.
- Treat “modifier-shaped” as an ergonomic target: a reusable element-backed
  value that is attachable and readable.
- Keep scheduling, `RUNTIME.subscribe`, and publication adapter-local unless
  future evidence proves a broader shared contract.
- Do not expose `ElementPlaceholder` as the public contract.
- Do not create a public `@starbeam/modifier` package until a code Prepare /
  Execute / Review (PER) cycle proves the kernel shape.

The old `@starbeam/modifier` name is historical evidence. The adapter probes are
the source of truth.

## What would justify more shared vocabulary

The minimal shared setup/finalization primitive now lives in `@starbeam/renderer`.
Move more vocabulary out of adapter-local code only when there is concrete
pressure, such as:

- a third-party adapter needing the same DOM attachment contract;
- React, Preact, Vue, and Svelte converging on the same adapter-author result
  shape;
- a code PER cycle proving scheduling or publication is generic rather than
  framework-local;
- adapter-author docs needing a stable name that cannot live in a single
  framework package.

Until then, the public 0.9 surface should stay as official adapter APIs plus
framework-neutral prose.

## Not in this review

This review does not:

- add or expose `@starbeam/modifier`;
- rename React, Preact, Vue, or Svelte adapter APIs;
- choose the final Svelte API;
- bless the Vue handle spelling as final;
- move scheduling or publication into `@starbeam/renderer` or
  `@starbeam/universal`;
- change package manifests, generated artifacts, or tests.
