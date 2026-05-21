# Website Readiness Map

This map is the handoff from package-surface stabilization to website planning.
It records which existing docs are canonical source material, which docs need
rewrite or quarantine, and what must be resolved before the documentation site is
scaffolded.

The goal is to let the information architecture drive website work before the
project chooses site tooling.

## Current status

The core surface decisions are now stable enough to plan a website:

- `@starbeam/universal` is the canonical framework-neutral app/library import
  surface.
- `@starbeam/resource` is the public resource authoring package.
- `@starbeam/service` is the public low-level app-scoped service kernel, while
  framework adapters own the app-author service APIs.
- `@starbeam/reactive` is public for primitive reactive values.
- `@starbeam/runtime`, `@starbeam/tags`, and `@starbeam/interfaces` are
  low-level implementor/protocol surfaces.
- `@starbeam/core` is a deprecated compatibility alias for
  `@starbeam/universal`.
- `@starbeam/renderer` is the adapter-author kit.
- `@starbeam/modifier` is internal historical evidence, not the public DOM
  attachment API.

## Docs inventory

Each source appears once in this inventory. The classification says where it
belongs in the website plan, and the notes explain what work is needed before it
can become site content.

| Source                                                                                                      | Classification                | Website use                                    | Notes                                                                                            |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [README.md](../README.md)                                                                                   | Canonical with caveats        | Homepage source                                | Current landing statement, but too thin for a docs homepage.                                     |
| [packages/universal/universal/README.md](../packages/universal/universal/README.md)                         | Canonical                     | Start, library-author guide, reference         | Canonical framework-neutral imports, direct package imports, compatibility exports.              |
| [packages/universal/resource/README.md](../packages/universal/resource/README.md)                           | Canonical                     | Core concepts and reference                    | Resource authoring, `Resource`, `ResourceList`, sync and finalization semantics.                 |
| [packages/universal/service/README.md](../packages/universal/service/README.md)                             | Canonical                     | Services concept and reference                 | Low-level service kernel, app-scoped service semantics, non-goals.                               |
| [packages/react/react/README.md](../packages/react/react/README.md)                                         | Canonical                     | React framework guide                          | React hook surface, element resources, framework bridge guidance.                                |
| [packages/universal/reactive/README.md](../packages/universal/reactive/README.md)                           | Canonical with caveats        | Core concepts and reference                    | Good primitive details; getting-started docs should teach imports through `@starbeam/universal`. |
| [packages/universal/collections/README.md](../packages/universal/collections/README.md)                     | Canonical with caveats        | Collections concept and reference              | Strong conceptual explanation; needs install/import/API reference polish.                        |
| [packages/vue/vue/README.md](../packages/vue/vue/README.md)                                                 | Canonical with caveats        | Vue framework guide                            | Useful current API notes; Vue 0.9 scope/status still needs confirmation.                         |
| [packages/svelte/svelte/README.md](../packages/svelte/svelte/README.md)                                     | Canonical with caveats        | Svelte framework guide                         | Current element-resource docs; not a full Svelte adapter guide.                                  |
| [docs/DOM-ATTACHMENT-BOUNDARY.md](./DOM-ATTACHMENT-BOUNDARY.md)                                             | Canonical                     | DOM attachment concept                         | Current DOM attachment decision and element resource boundary.                                   |
| [docs/DOM-ATTACHMENT-ERGONOMICS.md](./DOM-ATTACHMENT-ERGONOMICS.md)                                         | Canonical with caveats        | DOM attachment rewrite source                  | Useful decision record; not a final public guide.                                                |
| [docs/INVARIANTS.md](./INVARIANTS.md)                                                                       | Implementor / rewrite source  | Advanced architecture; public concept rewrites | Authoritative semantics; distill public concepts before using in first-run docs.                 |
| [docs/PACKAGE-SURFACE.md](./PACKAGE-SURFACE.md)                                                             | Implementor / decision record | Advanced package policy                        | Canonical release-surface policy, not user-facing tutorial prose.                                |
| [docs/PACKAGE-SURFACE-TRIAGE.md](./PACKAGE-SURFACE-TRIAGE.md)                                               | Implementor / decision record | Advanced package policy and package map source | Current package taxonomy and compatibility policy; rewrite for users.                            |
| [packages/universal/renderer/README.md](../packages/universal/renderer/README.md)                           | Implementor                   | Advanced adapter-author guide                  | Current adapter-author material, not getting-started content.                                    |
| [packages/universal/tags/README.md](../packages/universal/tags/README.md)                                   | Implementor                   | Advanced protocol guide                        | Demand-driven validation substrate.                                                              |
| [packages/universal/interfaces/README.md](../packages/universal/interfaces/README.md)                       | Implementor                   | Advanced protocol guide                        | Type-only protocol substrate.                                                                    |
| [packages/universal/shared/README.md](../packages/universal/shared/README.md)                               | Implementor                   | Advanced protocol guide                        | Cross-copy/cross-version shared fundamentals.                                                    |
| [packages/universal/universal/CONCEPTS.md](../packages/universal/universal/CONCEPTS.md)                     | Historical / archive          | Archive only                                   | Explicitly historical; contains stale `service` imports from `@starbeam/universal`.              |
| [packages/universal/runtime/README.md](../packages/universal/runtime/README.md)                             | Historical / archive          | Archive only; rewrite source for advanced docs | Explicitly outdated; contains historical timeline/API language and stale examples.               |
| [packages/universal/debug/src/description/README.md](../packages/universal/debug/src/description/README.md) | Historical / internal         | Archive only                                   | Explicitly outdated and internal to debug architecture.                                          |
| [packages/react/react/src/modifiers/README.md](../packages/react/react/src/modifiers/README.md)             | Rewrite needed                | None until rewritten                           | Under construction.                                                                              |
| [packages/react/use-strict-lifecycle/README.md](../packages/react/use-strict-lifecycle/README.md)           | Canonical with caveats        | Public infrastructure package guide            | React lifecycle infrastructure; not a first-run app-author path.                                 |
| [packages/x/store/README.md](../packages/x/store/README.md)                                                 | Experiment / rewrite needed   | Experiments section                            | Example-heavy fragment, not a package overview.                                                  |
| [packages/x/vanilla/README.md](../packages/x/vanilla/README.md)                                             | Experiment / rewrite needed   | Experiments section                            | Explicitly experimental and minimal.                                                             |

## Blockers before website scaffolding

These are content and decision blockers. Resolve them before choosing site
technology or creating a docs app.

### Must-have

1. **Homepage and getting-started path.** The root README is not enough for a
   public docs homepage.
2. **Package chooser.** Users need a direct answer to which package to install
   and which package to import from.
3. **Preact guide.** `@starbeam/preact` is public, but has no top-level README.
4. **React app-author guide.** The React README lists hooks, but needs a real
   install/setup/resource/service walkthrough.
5. **Vue scope/status.** Triage still treats Vue as public if it is in 0.9
   scope; decide whether the website teaches Vue as first-class now.
6. **Svelte scope/status.** Svelte has package docs, but the public package
   taxonomy should explicitly say whether it is first-class for this website.
7. **Historical quarantine.** Runtime and universal historical docs must not
   appear as current docs in the site nav.
8. **`@starbeam/use-strict-lifecycle` README.** Completed after website
   scaffolding. The package is public React lifecycle infrastructure, not a
   first-run app-author path.
9. **App-author service examples.** Website service docs should show framework
   adapter APIs, not only the low-level `app` object path.

### Nice-to-have

- API reference generated from exports.
- Migration page from `@starbeam/core` to `@starbeam/universal`.
- Experiment section for `@starbeamx/store` and `@starbeamx/vanilla`.
- Advanced protocol section for `@starbeam/runtime`, `@starbeam/tags`,
  `@starbeam/interfaces`, and `@starbeam/renderer`.
- Public rewrite of the invariants into tutorial prose.

## Proposed information architecture

The website should separate the user path from reference and implementor detail.
This keeps protocol and package-boundary concerns from leaking into the first-run
experience.

1. **Start**
   - What is Starbeam?
   - Install and choose your framework.
   - First reactive value with `Cell` and `Formula`.
   - First resource with `Resource`.

2. **Core concepts**
   - Reactive storage: `Cell`, `Marker`.
   - Derived reads: `Formula`, `CachedFormula`, `read`.
   - Resources and cleanup.
   - Collections.
   - Services and app lifetime.
   - DOM attachment and element resources.

3. **Framework guides**
   - React: `useReactive`, `useResource`, `useService`, `useElementResource`,
     bridge argument.
   - Preact: needs a new guide.
   - Vue: `setupReactive`, `setupResource`, `setupService`,
     `elementResourceDirective`, `elementResource`.
   - Svelte: `elementResource`, `elementResourceStore`,
     `elementResourceAttachment`.

4. **Library-author guide**
   - Use `@starbeam/universal`.
   - Author reusable resources.
   - Return domain-shaped values.
   - Know when to import direct packages such as `@starbeam/resource`.

5. **Reference**
   - Public package map.
   - `@starbeam/universal`.
   - `@starbeam/resource`.
   - `@starbeam/service`.
   - `@starbeam/reactive`.
   - Framework adapters.
   - `@starbeam/core` compatibility alias.

6. **Advanced / implementor**
   - Renderer adapter kit.
   - Runtime, tags, interfaces, and shared.
   - Invariants.
   - React Compiler and lifecycle details.
   - Package-surface policy.

7. **Experiments**
   - `@starbeamx/store`.
   - `@starbeamx/vanilla`.

8. **Archive**
   - Historical runtime notes.
   - Historical universal concepts.
   - Debug architecture notes.

## Recommended next milestones

1. **README polish for the app-author front door.** Update the root README,
   `@starbeam/universal`, React, Preact, Vue/Svelte status, and app-author
   service/resource examples so they align with the proposed IA.
2. **Docs website scaffold.** Choose the site technology only after the first-run
   IA and content blockers above are explicit.
3. **Advanced/reference pass.** Move implementor content into advanced/reference
   sections after the first-run user path is coherent.
