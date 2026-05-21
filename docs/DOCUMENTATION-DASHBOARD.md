# Documentation Dashboard

This dashboard tracks the documentation work that remains after the first public
website spine landed. The website now has a coherent path for app authors, but
the package READMEs, reference routes, and status language still need to absorb
the same decisions.

Use this document to choose the next Prepare / Execute / Review (PER) arc. Each
arc should still get a fresh Prepare before editing.

## Current state

| Area                   | Status       | Notes                                                                                                  |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| Homepage               | Done         | Public narrative is aligned around “Reactivity that stays JavaScript.”                                 |
| Start                  | Done         | Introduction and install chooser teach framework-neutral and adapter paths.                            |
| Core concepts          | Partial      | Overview and lifecycle exist; collections, services, and element resources still need their own pages. |
| Framework guides       | Partial      | React, Preact, Vue, and Svelte pages exist; status and package README alignment remains.               |
| Library authors        | Done         | Reusable framework-neutral abstractions have a first guide.                                            |
| Reference              | Partial      | Current page is a package map, not a usable API reference.                                             |
| Advanced / implementor | Done for now | It routes readers to source notes and records the status of implementor material.                      |
| Experiments            | Done for now | Experiments are quarantined, but package READMEs still need cleanup.                                   |
| Archive                | Done         | Historical material is explicitly quarantined.                                                         |
| Root README            | Done         | It now routes readers into the website instead of old package README lists.                            |
| Ember adapter docs     | Deferred     | Do not integrate Ember into the website until the adapter surface has been reviewed.                   |

## North star

The remaining documentation work should reinforce the public model:

- **Reactivity that stays JavaScript.**
- **Mark root state. Keep the rest JavaScript.**
- Use collection-shaped reactive storage when the state is collection-shaped.
- Use object-shaped reactive storage when the state is object-shaped, even when
  the object has only one public slot.
- Keep reactive storage private inside domain objects.
- Expose domain-shaped getters, methods, and values.
- Use resources when work has setup, sync, cleanup, or finalization.
- Treat services as app-scoped resources.
- Treat element resources as DOM attachment with framework-owned timing.
- Keep `Cell`, `Marker`, protocol, runtime, and adapter-author details out of
  first-run docs unless the page is explicitly about building primitives.

## Dashboard

| Priority | Arc                                      | Status  | Primary files                                                                                    | Why it matters                                                                                                                          |
| -------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Collections concept + package README     | Done    | `workspace/docs/src/content/docs/concepts/`, `packages/universal/collections/README.md`          | Collections are now the preferred root-state story for collection-shaped data, with a concept route and aligned package README.         |
| P0       | Reactive primitive README rewrite        | Next    | `packages/universal/reactive/README.md`                                                          | `@starbeam/reactive` is public for authors building primitives, but the README still blends that surface with runtime/protocol caveats. |
| P1       | Preact package README                    | Ready   | `packages/preact/preact/README.md`                                                               | Preact has a website guide and public package, but no package-level front door.                                                         |
| P1       | Core deprecation README + migration page | Done    | `packages/universal/core/README.md`, `workspace/docs/src/content/docs/`                          | Existing users now have package and website migration guidance from `@starbeam/core` to `@starbeam/universal`.                          |
| P1       | Concept route expansion                  | Ready   | `workspace/docs/src/content/docs/concepts/`, `workspace/docs/astro.config.mjs`                   | Services and element resources are central concepts but currently live inside overview/lifecycle pages.                                 |
| P1       | Reference expansion                      | Ready   | `workspace/docs/src/content/docs/reference/`, `workspace/docs/astro.config.mjs`                  | The Reference route currently cannot answer concrete API questions.                                                                     |
| P2       | Status consistency pass                  | Ready   | `README.md`, framework docs, package READMEs, install/reference pages                            | Svelte, Vue, and experiments need consistent status language across entry points.                                                       |
| P2       | `@starbeam/use-strict-lifecycle` README  | Ready   | `packages/react/use-strict-lifecycle/README.md`, `packages/react/use-strict-lifecycle/THEORY.md` | A public package currently ships an empty README.                                                                                       |
| P2       | Experiment package README cleanup        | Ready   | `packages/x/store/README.md`, `packages/x/vanilla/README.md`, experiment package metadata        | The website quarantines experiments, but package surfaces still leak stale or placeholder signals.                                      |
| P3       | Ember website integration                | Blocked | Ember package/docs after PR #273 is reviewed                                                     | The adapter surface needs review before it becomes part of the public framework guide set.                                              |

## PER arcs

### PER 1: Collections concept and package README

**Hypothesis:** Collections should become the first standalone concept page after
lifecycle, and the package README should match the collections-first Start path.

**Prepare**

- Confirm the current public `@starbeam/collections` exports and construction
  forms.
- Compare Start, Concepts, Library Authors, and Reference examples for the
  collections vocabulary they already use.
- Identify stale or broken claims in the current package README.
- Decide whether the concept page teaches only public usage or also granular
  invalidation rules.

**Execute**

- Add `workspace/docs/src/content/docs/concepts/collections.md`.
- Add the page to the Core concepts sidebar.
- Rewrite `packages/universal/collections/README.md` as a package front door.
- Link the package README back to the website concept page and Start guide.

**Review**

- Confirm examples use `reactive.Map`, `reactive.object`, or other collection
  APIs when the state shape calls for them.
- Confirm the page does not teach `Cell` as the app-facing answer for “one
  thing.” If a public value is object-shaped, use `reactive.object({ current:
... })` or a more domain-shaped object.
- Confirm granular invalidation is explained as predictable storage invalidation,
  not as result equality.
- Validate docs lint/types/build if the website sidebar or content changes.

### PER 2: Reactive primitive README rewrite

**Hypothesis:** `@starbeam/reactive` should be documented as the surface for
authors building primitives, without making `Cell`, `Marker`, or
runtime/protocol helpers feel like first-run app-author APIs.

**Prepare**

- Confirm the app/library primitive exports recorded in the package-surface
  roadmap.
- Identify exports that remain public for adapter/runtime/debug compatibility.
- Check current examples for stale React or old primitive vocabulary.

**Execute**

- Rewrite `packages/universal/reactive/README.md` around the primitive-building
  role of `Cell`, `Marker`, `Formula`, `CachedFormula`, `Static`, and `read`.
- Add a clear “not the app starting point” section that routes most users to
  `@starbeam/universal` and `@starbeam/collections`.
- Move runtime/protocol/debug helpers into a compatibility or implementor note.

**Review**

- Confirm the README does not imply runtime setup is an app-author concern.
- Confirm examples use current public APIs.
- Confirm the primitive package remains framed as lower-level than Start and not
  as the normal way to represent a single app value.

### PER 3: Preact package README

**Hypothesis:** Preact needs a compact package README that mirrors the website
guide and makes `install(options)` the framework bridge.

**Prepare**

- Confirm current `@starbeam/preact` exports and README absence.
- Compare the Preact framework guide to the package manifest files list.
- Decide which examples belong in the package README versus the website guide.

**Execute**

- Add `packages/preact/preact/README.md`.
- Document install, `install(options)`, direct render reads, resources, services,
  and element resources.
- Link to the website Preact guide for the full walkthrough.

**Review**

- Confirm it does not introduce React-style `useReactive()` as the main Preact
  path.
- Confirm examples use collections or reactive objects where appropriate.
- Confirm package metadata already includes the README in published files.

### PER 4: Core deprecation and migration path

**Hypothesis:** `@starbeam/core` should have an explicit compatibility README and
the website should include a small migration route.

**Conclusion:** `@starbeam/core` remains as a deprecated compatibility alias
during the compatibility window. The current action is documentation and
migration guidance, not deletion. Removing the package is a later breaking
cleanup.

**Prepare**

- Confirm what `@starbeam/core` currently exports and how it aliases
  `@starbeam/universal`.
- Check existing docs that mention the deprecation.
- Decide whether the migration page belongs under Start, Reference, or Archive.

**Execute**

- Add `packages/universal/core/README.md`.
- Add a website migration page from `@starbeam/core` to `@starbeam/universal`.
- Link the migration page from install and reference pages.

**Review**

- Confirm new docs do not encourage new code to import from `@starbeam/core`.
- Confirm old users get a clear replacement import path.
- Confirm package and website language agree.

### PER 5: Concept route expansion

**Hypothesis:** Services and element resources should have first-class concept
routes, while lifecycle remains the progression page that connects them.

**Prepare**

- Identify the sections currently compressed into `concepts/lifecycle.md`.
- Compare service and element-resource vocabulary across framework guides.
- Decide whether collections is already handled by PER 1 or belongs in this arc.

**Execute**

- Add concept pages for services and element resources / DOM attachment.
- Move or summarize material from lifecycle without duplicating examples too
  heavily.
- Update the sidebar and cross-links.

**Review**

- Confirm app-facing service docs point to framework adapter APIs first.
- Confirm low-level `@starbeam/service` and `@starbeam/renderer` details are
  routed to Reference or Advanced, not first-run concepts.
- Confirm framework guide links still land on the right conceptual explanations.

### PER 6: Hand-written reference expansion

**Hypothesis:** The Reference section needs hand-written subpages before a
generated API reference exists.

**Prepare**

- Decide the first batch of reference pages and their audience.
- Compare package README surfaces against website reference needs.
- Identify where package deprecation or experimental status must appear.

**Execute**

- Add reference pages for collections, universal, reactive primitives,
  resources, services, adapters, and core compatibility in small batches.
- Keep each page factual and API-shaped, with links back to concepts and guides.

**Review**

- Confirm Reference remains concise and does not become a second tutorial path.
- Confirm package statuses match install and package README language.
- Confirm docs build and sidebar links pass.

### PER 7: Status consistency pass

**Hypothesis:** The website and package READMEs should use the same status words
for Svelte, Vue, experiments, and direct packages.

**Prepare**

- Inventory status language in the root README, install page, framework overview,
  Svelte guide, Vue guide, reference, and package READMEs.
- Decide the preferred status words for “public,” “experimental,” “low-level,”
  “deprecated,” and “historical.”

**Execute**

- Add Svelte experimental/current-slice caveats to higher-level entry points
  where needed.
- Update the Vue package README to mention `useReactive()` and clarify
  `setupReactive()`.
- Align experiment package README/metadata language with the website quarantine.

**Review**

- Confirm readers do not get one status from the website and another from npm.
- Confirm Svelte is not presented as equivalent to React/Preact/Vue before its
  deeper integration work lands.
- Confirm Vue docs distinguish direct template reads from ref-producing helpers.

### PER 8: Public infrastructure README closeout

**Hypothesis:** Public but non-first-run packages need honest README pages even
when they are not part of the app-author path.

**Prepare**

- Read the `@starbeam/use-strict-lifecycle` theory notes and current package
  surface.
- Decide whether the README should be framed as standalone React lifecycle
  utility, Starbeam adapter infrastructure, or both.
- Check experiment package metadata for placeholder public descriptions.

**Execute**

- Write `packages/react/use-strict-lifecycle/README.md`.
- Clean up experiment package READMEs or explicitly mark them provisional.
- Link to Advanced or Experiments rather than Start.

**Review**

- Confirm public packages no longer ship empty or misleading README surfaces.
- Confirm these packages are not promoted as first-run app-author APIs.

### PER 9: Ember documentation integration

**Blocked until the adapter review happens.**

**Hypothesis:** If the Ember adapter surface is accepted, Ember should be wired
into the same public docs matrix as the other framework adapters.

**Prepare**

- Review the accepted Ember public surface after PR #273 is revised or approved.
- Decide whether Ember belongs beside React/Preact/Vue/Svelte or behind an
  experimental caveat.
- Confirm the read bridge, resource API, service API, and element-resource API
  are documented in Ember-native terms.

**Execute**

- Add an Ember framework guide.
- Add Ember to the homepage, framework overview, install chooser, reference, and
  root README if appropriate.
- Align the package README with the website guide.

**Review**

- Confirm the guide does not assume raw template reads are reactive without the
  Glimmer tag bridge.
- Confirm it does not wrap domain object construction in adapter helpers.
- Confirm examples keep reactive storage private and expose domain-shaped reads.

## Recommended next arc

After PER 1 lands, continue with **PER 2: Reactive primitive README rewrite**.

PER 1 reinforces the correction that started the current docs arc: when state is
collection-shaped, teach reactive collections as the root-state boundary instead
of teaching users to model a collection as a `Cell` around immutable updates.

The same principle applies to single-slot state in first-run docs: do not teach
`Cell` as the “one thing” primitive. If the public state wants a `current` slot,
`reactive.object({ current: ... })` has the same app-facing behavior while
keeping the teaching model object-shaped. Reserve `Cell` and `Marker` for pages
about building primitives or low-level reactive storage.

PER 2 should make that reservation explicit by rewriting the primitive package
README around authors building primitives, not app authors modeling ordinary
state.

## Validation checklist

Use this checklist for any arc that changes website content or package README
surfaces.

- The working tree contains only files for the current arc.
- New website pages are linked from `workspace/docs/astro.config.mjs`.
- Examples use current public imports.
- Examples keep reactive storage private unless the page is explicitly teaching
  primitives.
- First-run examples do not introduce `Cell` just because the example has one
  mutable value.
- Package README status language matches the website.
- Historical, protocol, and implementor details are routed to Advanced or
  Archive.
- Run docs lint/types/build when website content or sidebar links change.
- Run package-surface validation if manifests, exports, or published files
  change.
