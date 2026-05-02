# Package Surface Triage

This is the current working hypothesis for Starbeam's public npm surface. It
uses the heuristics in [PACKAGE-SURFACE.md](./PACKAGE-SURFACE.md).

The goal is not to classify packages by size. The goal is to recover the story
behind each boundary: audience, architecture, reusable infrastructure,
complete conceptual model, or intentional experiment.

## Strong public hypotheses

These packages currently have a positive public-package story.

| Package                          | Hypothesis                     | Reason                                                                                     | Action                                                                                               |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `@starbeam/react`                | Public                         | React adapter; distinct user audience.                                                     | Keep public. Reduce internal manifest deps.                                                          |
| `@starbeam/preact`               | Public                         | Preact adapter; distinct user audience.                                                    | Keep public.                                                                                         |
| `@starbeam/vue`                  | Public, if Vue is in 0.9 scope | Vue adapter; distinct user audience.                                                       | Confirm release scope.                                                                               |
| `@starbeam/shared`               | Public                         | Architectural substrate for cross-copy and cross-version interoperability.                 | Keep public. Majors should require explicit intent.                                                  |
| `@starbeam/collections`          | Public                         | Documented reactive collection package with direct value proposition.                      | Keep public. Remove support deps.                                                                    |
| `@starbeam/resource`             | Public                         | Direct resource composition package with package-level docs.                               | Keep public if resources are standalone API.                                                         |
| `@starbeam/use-strict-lifecycle` | Public reusable infrastructure | Solves a standalone React lifecycle problem under Strict Mode, remounts, and hidden trees. | Write README from THEORY; separate public lifecycle API from Starbeam-specific read-barrier helpers. |
| `@starbeamx/store`               | Public experiment              | Usable reactive table/query/group/aggregate experiment.                                    | Keep as `@starbeamx`; align README with actual API.                                                  |
| `@starbeamx/vanilla`             | Public experiment              | Minimal DOM renderer and reference implementation for Starbeam renderer authors.           | Keep as `@starbeamx`; add usage docs and round out tests.                                            |

## Conceptual boundaries that need decisions

These packages are not obviously wrong. They encode real architectural stories,
but we need to decide which audiences are supported in 0.9 and whether the
current package names are the right public surface.

| Package                | Better hypothesis                                                              | Why we cared                                                                                                                                                                                                                   | Current conflict                                                                                                                                              | Suggested action                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@starbeam/modifier`   | Internal element-attachment kernel; mandatory post-surface hardening candidate | Represents the ref/directive/modifier part of complete framework reactivity. The basic idea composes resources, element availability, and framework lifetimes. Historically backed React refs and universal element resources. | Current adapter APIs/docs are stale or removed; package only exposes `ElementPlaceholder`; React dependency appears stale. Cross-framework glue needs design. | Keep internal during the package-surface arc, then run a focused hardening PER sequence alongside renderer to see whether the ref/directive/modifier story can be made solid for 0.9. |
| `@domtree/*`           | Internal DOM-type substrate; tied to modifier hardening                        | Type-level DOM flavor normalization: write DOM algorithms against minimal structural DOM while preserving browser/JSDOM/range types.                                                                                           | Original DOM renderer is gone; current active leak is mostly through `@starbeam/modifier` and stale manifests.                                                | Keep internal unless modifier/renderer hardening proves public authors need these types directly.                                                                                     |
| `@starbeam/interfaces` | Decision needed / protocol surface                                             | Internal protocol type boundary for runtime/tags/reactive/debug without cycles.                                                                                                                                                | No README, special `library:interfaces`, stale-looking `src/protocol.ts`, stale `@domtree/any` manifest dependency, broad declaration leakage.                | Decide whether protocol types are public. Consider a better public `@starbeam/protocol` surface or re-export strategy.                                                                |
| `@starbeam/tags`       | Decision needed                                                                | Validation/tag substrate extracted from runtime; core of demand-driven validation.                                                                                                                                             | Low-level implementor API, not normal app-user API.                                                                                                           | Bless as implementor API or hide behind `reactive`/`runtime`.                                                                                                                         |
| `@starbeam/runtime`    | Decision needed                                                                | Runtime coordination, subscriptions, finalization scopes; intentionally split from reactive primitives.                                                                                                                        | README says stable for libraries but not app code; public exports are low-level.                                                                              | Decide whether runtime/library authors are supported. Refresh docs if public.                                                                                                         |
| `@starbeam/renderer`   | Conditional public adapter-author kit                                          | Real shared adapter kernel for owner identity, setup values, resources, services, and scheduling. Preact fits best; Vue fits closely; React uses the vocabulary but owns more lifecycle timing for strict semantics.    | Public only if 0.9 supports framework adapter authors. Needs crisp package docs, contract tests for exported manager helpers, and artifact checks for private leaks. | Run a focused public-hardening PER. Keep public only if the arc produces an adapter-author story that passes docs, tests, and package-surface verification; otherwise make it internal. |
| `@starbeam/service`    | Decision needed                                                                | App-scoped singleton resource machinery used by adapters/renderer.                                                                                                                                                             | README appears copied from resource docs; old universal docs say `service` belongs in `@starbeam/universal`, but current universal index does not export it.  | Decide if service is direct API, universal re-export, renderer-author API, or private adapter support.                                                                                |
| `@starbeam/reactive`   | Public primitive surface, needs split                                          | Primitive reactive values are documented and useful to library authors.                                                                                                                                                        | Exports include runtime wiring/debug/tracking-frame substrate, not just public primitives.                                                                    | Keep public for primitives. Move/hide runtime wiring and tracking internals behind internal or future author-facing surfaces.                                                         |
| `@starbeam/universal`  | Main public umbrella candidate                                                 | Best current framework-agnostic entrypoint over cells, formulas, resources, and common integration concepts.                                                                                                                   | Leaks low-level package names in JS and declarations; service docs conflict with exports.                                                                     | Make it the public umbrella over private substrates. Re-export service if public; stop exposing raw runtime/protocol pieces as the story.                                             |
| `@starbeam/core`       | Compatibility decision                                                         | Deprecated alias over `@starbeam/universal`.                                                                                                                                                                                   | Root badge still points at it, but code is only a warning + re-export.                                                                                        | Decide old-import compatibility policy for 0.9.                                                                                                                                       |

## Private candidates

These packages currently lack a strong direct public story, though some need
engineering work before they can become private.

| Package                | Hypothesis        | Why                                                                                               | Main blockers                                                                             | Suggested PER                                                                                    |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@starbeam/verify`     | Private           | Internal assertion/type-narrowing support. A tidy API is not a public-package argument by itself. | Done: private/internal, inlined in public artifacts, no public runtime manifest leaks.    | Monitor verifier; no public surface unless a real audience appears.                              |
| `@starbeam/debug`      | Private           | Dev/runtime support and bootstrap implementation, not a direct install target.                    | Done: private/internal; `@starbeam/universal` owns and verifies the public DEV bootstrap. | Keep `test:workspace:debug-bootstrap` green; revisit only if a public diagnostics story appears. |
| `@starbeam/core-utils` | Private candidate | Generic JS utilities are not a Starbeam public goal by default.                                   | Very broad source, JS, and declaration usage.                                             | After debug/verify, inline or internalize utilities.                                             |

## Possible new public surfaces

Creating new packages is allowed if it makes the public story clearer.

| Possible package                                         | Purpose                                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@starbeam/universal` as umbrella                        | Main user/library surface over cells, formulas, resources, services, and common integration concepts.                                   |
| `@starbeam/protocol`                                     | Future explicit protocol/type package if runtime/framework authors become a supported audience. Better name than `interfaces`.          |
| `@starbeam/reactivity` or clarified `@starbeam/reactive` | Public primitive reactive values, separated from runtime wiring and tracking-frame internals if needed.                                 |
| `@starbeam/renderer`                                     | Future adapter-author surface if the current internal kernel is hardened with docs, extension points, and cross-adapter contract tests. |

## Suggested Prepare / Execute / Review (PER) order

PER means Prepare / Execute / Review: prepare a falsifiable plan, execute the
bounded change, then review the result against the prediction.

1. ~~Tighten release-surface verification so generated declarations and default
   JS cannot hide private-package leaks.~~ Done.
2. ~~`@starbeam/verify` and `@starbeam/debug` strategy.~~ Done: both are
   private/internal, with debug bootstrap covered through `@starbeam/universal`.
3. `@starbeam/core-utils` cleanup.
4. Modifier/domtree hardening PER sequence alongside renderer. Goal: determine
   whether ref/directive/modifier integration can become a solid 0.9 story
   across framework adapters.
5. Low-level surface consolidation: make `@starbeam/universal` the umbrella,
   split public `@starbeam/reactive` primitives from runtime wiring, place
   service intentionally, and target interfaces/tags/runtime as internal unless
   a future protocol package is needed.
6. Audience decision matrix for app users, library authors, framework
   contributors, and runtime/protocol implementors.
7. Renderer hardening PER series immediately after this package-surface arc.
   Goal: determine whether the internal kernel can become the adapter-author
   kit for 0.9.
8. Public-consumption polish for `@starbeam/use-strict-lifecycle` and
   `@starbeamx/*`.
9. `@starbeam/core` compatibility alias policy.
