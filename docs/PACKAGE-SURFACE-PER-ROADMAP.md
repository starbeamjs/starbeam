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

## 6. Lifecycle package disposition and audience matrix

**Question:** Which lifecycle-oriented packages are meant for app authors,
library authors, framework adapter authors, runtime/protocol implementors, or
internal maintainers?

This arc covers `@starbeam/resource`, `@starbeam/service`,
`@starbeam/modifier`, `@starbeam/universal`, and `@starbeam/renderer` as a
single decision interface. PER6a should not settle every package fate. It should
make the audience questions explicit enough that later PERs can make smaller
decisions without duplicating ownership.

**Current evidence:** Resources are a direct composition API. PER6c concluded
that services remain a direct public package as low-level app-scoped machinery
over resources, while primary app-facing service APIs live in framework
adapters. Modifier is historical element-attachment kernel evidence. Universal
is the app/library umbrella for framework-neutral authoring primitives, not
every public lifecycle API. Renderer is the adapter-author kit that now owns
`setupElementResource()`.

**Sub-arcs:**

- **6a. Audience matrix:** classify the five lifecycle packages by supported
  audience and record the remaining decisions.
- **6b. Resource docs/API vocabulary:** decide whether resource docs speak to
  app authors, library authors, or both.
- **6c. Service placement:** completed docs-only. `@starbeam/service` remains a
  public low-level app-scoped service kernel. Framework adapters remain the
  primary app-facing service APIs. No universal re-export, manifest, export, or
  artifact change was made.
- **6d. Universal umbrella shape:** completed docs-only. `@starbeam/universal`
  is the app/library umbrella for framework-neutral authoring concepts, not
  every public lifecycle API. No service re-export, manifest, export, or
  artifact change was made.
- **6e. Modifier cleanup:** completed docs-only. `@starbeam/modifier` stays
  internal historical evidence. Repo removal and npm deprecation are separate
  follow-ups and were not performed in this PER.
- **6f. Renderer confirmation:** confirm renderer's adapter-author boundary now
  that element-resource setup moved there.

**Possible outcomes:**

- docs-only audience matrix;
- one follow-up PER per package or audience;
- later export or manifest changes only after the audience story is settled.

**PER6c conclusion:** The service placement conflict is resolved without package
surface changes. `@starbeam/service` stays public as the low-level kernel for
adapter/runtime and manual app integration. React `useService`, Preact
`useService`/`setupService`, and Vue `setupService` are the app-author APIs.
`@starbeam/universal` still does not re-export service.

**PER6d conclusion:** The universal umbrella shape is resolved without package
surface changes. `Resource` remains the current lifecycle authoring re-export
from `@starbeam/universal`. `service`, `setupResource`, `ResourceList`,
`SyncTo`, and `PrimitiveSyncTo` stay as direct imports from `@starbeam/service`
or `@starbeam/resource` pending a later export-completion PER.

**PER6e conclusion:** The modifier cleanup policy is resolved without package or
registry changes. `@starbeam/modifier` is internal historical evidence, and
`ElementPlaceholder` is not the public DOM attachment API. Removing the repo
package is a later code cleanup. Deprecating the historical npm package is a
separate release-owner action.

**Validation:** docs diff for PER6a/PER6c/PER6d/PER6e. Package-surface checks
only if a later sub-arc changes manifests, exports, or generated artifacts.

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

## 8. Protocol surfaces and compatibility policy

**Question:** Which low-level protocol surfaces are supported public API, and
what compatibility policy applies to old imports?

`@starbeam/universal` and `@starbeam/service` ownership moved to PER6. This arc
should focus on the remaining compatibility and implementor-surface questions:

- whether `interfaces`, `tags`, and `runtime` are implementor/protocol surfaces
  or internal substrates;
- whether a future `@starbeam/protocol` package is clearer;
- what compatibility policy applies to the deprecated `@starbeam/core` alias.

**Prepare should not reopen lifecycle package placement.** It should consume the
PER6 matrix and ask only what protocol/core compatibility decisions remain.

**Possible outcomes:**

- protocol-surface taxonomy;
- future `@starbeam/protocol` proposal;
- explicit 0.9 compatibility policy for `@starbeam/core`.

**Validation:** docs and package artifact inspection until export moves are
proposed.

## Suggested order

1. Renderer reflow and README closeout.
2. Production property mangling policy.
3. Svelte API confidence.
4. Vue template ergonomics proof.
5. React/Preact relationship docs.
6. Lifecycle package disposition and audience matrix.
7. `@starbeam/reactive` primitive split.
8. Protocol surfaces and core compatibility policy.

The first five are cleanup and confidence work following the DOM attachment arc.
The last three reopen the broader package-surface roadmap.
