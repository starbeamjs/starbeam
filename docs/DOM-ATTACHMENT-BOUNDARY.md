# DOM Attachment Boundary

This is the current decision record for Starbeam's DOM attachment concept after
the React, Preact, Vue, and Svelte recon work.

## Decision

For 0.9, DOM attachment is a public concept with official adapter APIs, not a
new shared public package boundary.

- React and Preact keep their idiomatic `useElementResource` leaves.
- Vue exposes `elementResourceDirective` for directive-owned element resources.
- Svelte exposes an experimental attachment API for element resources.
- `@starbeam/modifier` stays internal. Its current `ElementPlaceholder` is
  historical kernel evidence, not the public contract.
- `@starbeam/renderer` owns the shared adapter-author setup/finalization
  primitive for element-backed resources. Adapters still own element delivery,
  scheduling, runtime subscription, and publication.
- `@starbeam/universal` may eventually document framework-neutral element
  resources for app and library authors, but should not expose ref, directive,
  or modifier-shaped APIs in 0.9.

Future code moves should be driven by adapter duplication or concrete framework
evidence, not by the existence of the old modifier package name. The current
ergonomics evidence is reviewed in
[DOM Attachment Ergonomics Review](./DOM-ATTACHMENT-ERGONOMICS.md).

After the Vue and Svelte experiments, `@starbeam/renderer` exposes
`setupElementResource()` for the framework-neutral part of element resources:
constructing a Starbeam resource from an element and returning its `value`,
`sync`, and `finalize` handles. Vue and Svelte use that primitive. Their
framework adapters still decide when to subscribe, when to schedule `sync()`, how
to publish `T | null`, and how the framework supplies the element.

## What is stable

The stable concept is:

1. A framework supplies an element.
2. Starbeam creates resource-backed work for that element.
3. The resource cleanup follows the framework's element lifetime.

The shared creator shape is resource-shaped:

```ts
type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;
```

An element-resource creator should return a domain-shaped value. Reactive
storage is an implementation detail, per
[Starbeam Invariants](./INVARIANTS.md#public-apis-expose-domain-concepts-not-reactive-storage):

```ts
function ElementSize(element: HTMLElement) {
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
```

Consumers should read `size.width`, not `size.width.current`. If a consumer sees
`.current`, it should be because it is holding an intentionally reactive
primitive or an adapter result slot such as React's attached resource value.

## Framework dialects

Refs, directives, and modifiers are framework dialects for delivering the
element. They are not the stable Starbeam contract name.

| Framework | Dialect          | Proven API or evidence      | Current status            |
| --------- | ---------------- | --------------------------- | ------------------------- |
| React     | callback ref     | `useElementResource`        | Public adapter leaf       |
| Preact    | callback ref     | `useElementResource`        | Public adapter leaf       |
| Vue       | custom directive | `elementResourceDirective`  | Public adapter leaf       |
| Svelte    | `{@attach ...}`  | `elementResourceAttachment` | Experimental adapter leaf |

### React and Preact

React and Preact expose the same adapter-local result shape:

```ts
type ElementResource<T, E extends Element> =
  | { readonly status: "pending"; readonly ref: (element: E | null) => void }
  | {
      readonly status: "attached";
      readonly ref: (element: E | null) => void;
      readonly current: T;
    };
```

The `ref` is the framework delivery mechanism. The `pending | attached` state is
an adapter result shape, not the shared creator contract.

`attached` means Starbeam has created the element-backed resource value. It does
not mean `on.sync` has run, and it should not grow a public `ready` or `synced`
state without new evidence.

### Vue

Vue proves the non-hooks dialect. `elementResourceDirective` creates a custom
directive that can:

- create a resource scope when `mounted` receives the element;
- subscribe runtime invalidations with `RUNTIME.subscribe`;
- schedule `sync()` through Vue `nextTick`;
- keep cleanup per element with a `WeakMap`;
- unsubscribe and finalize the scope on `unmounted`.

The public API uses the same directive-owned lifetime path proven by the probe.
The component-centered `@starbeam/vue` `setupResource` path is not the right
directive-hook mechanism. Directive hooks do not have setup-time
`getCurrentInstance()` context.

### Svelte

Svelte 5.29 and newer expose attachments with `{@attach ...}`. An attachment is
an element-first function that runs when the element is mounted and may return a
cleanup function. Svelte reruns an attachment when state read by the attachment
expression changes, and it calls cleanup before rerun or after the element is
removed.

The Svelte probe now exists as an experimental adapter leaf. It validates
attachment-owned lifetime and compares callback-sink and store-sink publication
styles:

```svelte
<script lang="ts">
  import { elementResourceAttachment } from "@starbeam/svelte";
  import type { IntoResourceBlueprint } from "@starbeam/resource";

  interface Size {
    readonly width: number;
    readonly height: number;
  }

  type ElementResourceBlueprint<E extends Element, T> = (
    element: E,
  ) => IntoResourceBlueprint<T>;

  declare const ElementSize: ElementResourceBlueprint<HTMLElement, Size>;

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

Svelte actions (`use:`) remain available, but Svelte's docs say attachments
supersede actions in Svelte 5.29 and newer. Actions are therefore a fallback for
older Svelte versions, not the primary dialect for new Starbeam design.

Svelte also provides `createAttachmentKey` for programmatic object-spread
attachments. That may matter for library-author ergonomics, but it should follow
the basic attachment probe.

The open Svelte question is no longer whether Svelte can deliver an element and
cleanup lifetime. It can. The open question is which publication style should be
primary and whether the store-shaped experiment is the right reusable
attachable/readable object for Svelte authors.

## Boundary matrix

| Boundary              | Audience                                     | Fits                                                                   | Problems                                                                 | 0.9 decision                       |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| Official adapters     | App authors using React, Preact, Vue, Svelte | Idiomatic framework leaves; already proven for React/Preact            | Duplicated local result shapes                                           | Keep                               |
| `@starbeam/renderer`  | Adapter authors                              | Existing adapter-author kit; owns shared setup/finalization vocabulary | Scheduling and publication are still adapter-specific                    | Owns the shared setup primitive    |
| `@starbeam/universal` | App and library authors                      | Framework-neutral package; good home for prose concepts                | Ref/directive/modifier APIs are not framework-neutral                    | Document concept later, no 0.9 API |
| `@starbeam/modifier`  | Internal DOM attachment kernel candidate     | Historical name and `ElementPlaceholder` evidence                      | Current API is not resource-shaped; package name pulls toward old design | Keep internal                      |
| New package           | Independent DOM attachment authors           | Clean boundary if concept becomes installable                          | No independent audience yet                                              | Do not create                      |
| No public boundary    | Official adapters only                       | Lowest surface area; matches current evidence                          | Duplicates types until pressure appears                                  | Current 0.9 default                |

## Why not promote `@starbeam/modifier` now

`@starbeam/modifier` currently exports `ElementPlaceholder`. It models delayed
element availability: initialize once, read `current`, and freeze the cell. That
overlaps with the first step of DOM attachment, but not the whole contract.

The proven contract also needs:

- resource setup from an element;
- `pending | attached` adapter states where appropriate;
- sync scheduling;
- cleanup/finalization;
- element replacement semantics;
- framework-specific delivery through refs or directives.

Promoting `@starbeam/modifier` before reshaping that kernel would make the old
artifact look like the stable API. It is better to keep it internal until a code
PER proves the right kernel shape.

## Future triggers

`@starbeam/renderer` now owns the minimal shared setup/finalization primitive.
Only move more vocabulary into `@starbeam/renderer` if any of these become true:

- React, Preact, Vue, and Svelte need the same adapter-author result shapes.
- A third-party adapter needs to implement DOM attachment.
- Official adapters start duplicating scheduling or publication logic that is
  not actually framework-specific.
- Vue and Svelte converge beyond setup/finalization on shared publication or
  handle vocabulary.

Expose framework-neutral vocabulary through `@starbeam/universal` only if app or
library authors need to name element resources outside a specific framework
adapter.

Revisit `@starbeam/modifier` only after a code PER proves whether it should be
reshaped as the internal kernel or retired.
