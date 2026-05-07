# Package Surface PER Roadmap

This is the working roadmap for the next Prepare / Execute / Review (PER) arcs
after the DOM attachment and element-resource boundary work.

The DOM attachment arc closed the basic boundary question:

- DOM attachment is a public Starbeam concept.
- Official adapters expose idiomatic framework APIs.
- `@starbeam/renderer` owns the shared `setupElementResource()` setup and
  finalization primitive for adapter authors.
- Scheduling, runtime subscription, value publication, and element delivery stay
  adapter-local.
- `@starbeam/modifier` remains internal historical evidence, not the public
  contract.

Use this roadmap to choose the next PER-sized topic. Each item should still get a
fresh Prepare before implementation.

## 1. Renderer reflow and README closeout

**Question:** Are the current local renderer README/test reflow edits meaningful,
and should `@starbeam/renderer` document `setupElementResource()` directly?

**Why now:** The renderer README is the only documentation intentionally skipped
when closing the element-resource arc because it already had local edits.

**Prepare should classify:**

- pure formatting/reflow;
- semantic README updates;
- test changes;
- editor recommendation changes.

**Possible outcomes:**

- discard purely accidental editor/config churn;
- commit formatting separately;
- add a focused renderer README section for `setupElementResource()`;
- keep renderer tests unchanged unless the dirty diff is meaningful.

**Validation:** markdown formatting, renderer docs diff review, and no unrelated
workspace files staged.

## 2. Production property mangling policy

**Question:** Should public object-contract keys have an explicit preservation
policy and test, instead of being discovered through package-surface failures?

**Current evidence:** production builds now reserve `attach`, `directive`,
`finalize`, `install`, `into`, `mounted`, `unmounted`, and `value`.

**Prepare should determine:**

- where public runtime object keys should be declared;
- whether the reserved list belongs in build config, package metadata, or a test
  fixture;
- whether package-surface verification should assert key preservation for public
  object contracts.

**Possible outcomes:**

- docs-only policy;
- build-config helper / named constant;
- artifact smoke test that imports production bundles and verifies known public
  keys.

**Validation:** production bundle inspection and `pnpm test:workspace:pack`.

## 3. Svelte element-resource API confidence

**Question:** Is `elementResource()` the settled Svelte authoring API, or still an
experiment beside `elementResourceStore()` and `elementResourceAttachment()`?

**Current evidence:** Svelte now supports:

```ts
const size = elementResource(ElementSize);
```

with:

```svelte
<section {@attach size.attach}>{$size?.width}</section>
```

**Prepare should compare:**

- `elementResource()` as primary API;
- `elementResourceStore()` as explicit compatibility spelling;
- `elementResourceAttachment()` as lower-level callback sink;
- whether the README should still call the package experimental.

**Possible outcomes:**

- docs-only confidence update;
- keep all names but mark primary vs. low-level;
- defer final naming until more Svelte user feedback.

**Validation:** Svelte README examples, Svelte typecheck/specs if code changes.

## 4. Vue template ergonomics proof

**Question:** Do we need a real Vue SFC/template fixture proving the documented
`size.width` template syntax for `elementResource()`?

**Current evidence:** render-function tests prove script reads through
`size.value`, while docs rely on Vue top-level ref unwrapping in templates.

**Prepare should determine:**

- whether the current Vue test harness can compile a small SFC fixture;
- whether the proof is worth adding now;
- whether docs should mention render-function vs. template usage more clearly.

**Possible outcomes:**

- test-only SFC ergonomics fixture;
- docs clarification only;
- defer because Vue's top-level ref unwrapping is sufficiently standard.

**Validation:** focused Vue specs from the workspace root and Vue typecheck.

## 5. React and Preact relationship to `setupElementResource()`

**Question:** Should React and Preact documentation explicitly say why they do
not use `setupElementResource()`?

**Current evidence:** React and Preact route element resources through their
existing hook/resource machinery because render safety and effect timing are
framework-specific.

**Prepare should decide:**

- whether to document React/Preact as constraints on the shared kernel;
- whether any code migration is warranted;
- whether the current docs already say enough.

**Likely outcome:** docs-only clarification, no code changes.

**Validation:** docs diff only unless examples change.

## 6. `@starbeam/modifier` fate

**Question:** Should `@starbeam/modifier` be retired, reshaped, or left as an
internal historical artifact?

**Current evidence:** `ElementPlaceholder` models element availability, not the
resource-shaped lifecycle contract. The current shared primitive lives in
`@starbeam/renderer`, not `@starbeam/modifier`.

**Prepare should inspect:**

- remaining imports of `@starbeam/modifier`;
- package manifests and generated artifacts;
- whether any code still depends on `ElementPlaceholder` semantics;
- whether the package should be renamed, deprecated, or kept internal.

**Possible outcomes:**

- docs-only deprecation note;
- internal cleanup PR;
- no-op until a broader package cleanup arc.

**Validation:** package-surface checks if manifests or exports change.

## 7. Public primitive split: `@starbeam/reactive`

**Question:** How should public reactive primitives be separated from runtime
wiring, debug, and tracking-frame internals?

**Current evidence:** `@starbeam/reactive` is useful public surface area, but it
also exports low-level substrate.

**Prepare should classify:**

- app/library-facing primitives;
- adapter/runtime-facing internals;
- debug-only APIs;
- possible re-export through `@starbeam/universal`.

**Possible outcomes:**

- docs taxonomy;
- export cleanup plan;
- package split proposal such as `@starbeam/reactivity`.

**Validation:** declaration and artifact inspection before any export move.

## 8. `@starbeam/universal`, service, protocol, and compatibility policy

**Question:** What is the next broad public package shape after DOM attachment?

This covers several related package-surface questions:

- should `@starbeam/universal` become the app/library umbrella;
- where `@starbeam/service` belongs;
- whether `interfaces`, `tags`, and `runtime` are implementor/protocol surfaces
  or internal substrates;
- whether a future `@starbeam/protocol` package is clearer;
- what compatibility policy applies to the deprecated `@starbeam/core` alias.

**Prepare should not do all of this at once.** It should first produce an
audience matrix:

- app users;
- library authors;
- framework adapter authors;
- runtime/protocol implementors;
- internal package maintainers.

**Possible outcomes:**

- audience decision matrix;
- one package-surface PER per audience;
- explicit 0.9 compatibility policy.

**Validation:** mostly docs and package artifact inspection until export moves are
proposed.

## Suggested order

1. Renderer reflow and README closeout.
2. Production property mangling policy.
3. Svelte API confidence.
4. Vue template ergonomics proof.
5. React/Preact relationship docs.
6. `@starbeam/modifier` fate.
7. `@starbeam/reactive` primitive split.
8. Universal/service/protocol/core compatibility arc.

The first five are cleanup and confidence work following the DOM attachment arc.
The last three reopen the broader package-surface roadmap.
