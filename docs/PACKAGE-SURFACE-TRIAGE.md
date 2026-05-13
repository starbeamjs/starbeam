# Package Surface Triage

This is the current working hypothesis for Starbeam's public npm surface. It
uses the heuristics in [PACKAGE-SURFACE.md](./PACKAGE-SURFACE.md).

The goal is not to classify packages by size. The goal is to recover the story
behind each boundary: audience, architecture, reusable infrastructure,
complete conceptual model, or intentional experiment.

## Strong public hypotheses

These packages currently have a positive public-package story.

| Package                          | Hypothesis                     | Reason                                                                                                                                  | Action                                                                                               |
| -------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `@starbeam/react`                | Public                         | React adapter; distinct user audience.                                                                                                  | Keep public. Reduce internal manifest deps.                                                          |
| `@starbeam/preact`               | Public                         | Preact adapter; distinct user audience.                                                                                                 | Keep public.                                                                                         |
| `@starbeam/vue`                  | Public, if Vue is in 0.9 scope | Vue adapter; distinct user audience.                                                                                                    | Confirm release scope.                                                                               |
| `@starbeam/shared`               | Public                         | Architectural substrate for cross-copy and cross-version interoperability.                                                              | Keep public. Majors should require explicit intent.                                                  |
| `@starbeam/collections`          | Public                         | Documented reactive collection package with direct value proposition.                                                                   | Keep public. Remove support deps.                                                                    |
| `@starbeam/resource`             | Public                         | Direct resource composition package with package-level docs.                                                                            | Keep public if resources are standalone API.                                                         |
| `@starbeam/service`              | Public low-level kernel        | App-scoped service machinery over resources, used directly by adapters and available for manual app integration.                        | Keep public. Primary app-facing APIs stay in framework adapters. Universal re-export remains PER6d.  |
| `@starbeam/renderer`             | Public adapter-author kit      | Shared adapter contract for framework implementors: manager identity, setup storage, scheduling, resources, services, and app lifetime. | Keep public. Renderer hardening arc completed in #190-#195.                                          |
| `@starbeam/use-strict-lifecycle` | Public reusable infrastructure | Solves a standalone React lifecycle problem under Strict Mode, remounts, and hidden trees.                                              | Write README from THEORY; separate public lifecycle API from Starbeam-specific read-barrier helpers. |
| `@starbeamx/store`               | Public experiment              | Usable reactive table/query/group/aggregate experiment.                                                                                 | Keep as `@starbeamx`; align README with actual API.                                                  |
| `@starbeamx/vanilla`             | Public experiment              | Minimal DOM renderer and reference implementation for Starbeam renderer authors.                                                        | Keep as `@starbeamx`; add usage docs and round out tests.                                            |

## Conceptual boundaries that need decisions

These packages are not obviously wrong. They encode real architectural stories,
but we need to decide which audiences are supported in 0.9 and whether the
current package names are the right public surface.

| Package                | Better hypothesis                                                              | Why we cared                                                                                                                                                                                                                   | Current conflict                                                                                                                                                                                     | Suggested action                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@starbeam/modifier`   | Internal element-attachment kernel; mandatory post-surface hardening candidate | Represents the ref/directive/modifier part of complete framework reactivity. The basic idea composes resources, element availability, and framework lifetimes. Historically backed React refs and universal element resources. | React and Preact now prove matching `useElementResource` leaves. Vue now proves that a directive can own an element resource lifetime. `@starbeam/modifier` still only exposes `ElementPlaceholder`. | Keep internal. Decide the shared element-resource vocabulary boundary before moving it into any public package.                           |
| `@domtree/*`           | Internal DOM-type substrate; tied to modifier hardening                        | Type-level DOM flavor normalization: write DOM algorithms against minimal structural DOM while preserving browser/JSDOM/range types.                                                                                           | Original DOM renderer is gone; current active leak is mostly through `@starbeam/modifier` and stale manifests.                                                                                       | Keep internal unless modifier/renderer hardening proves public authors need these types directly.                                         |
| `@starbeam/interfaces` | Decision needed / protocol surface                                             | Internal protocol type boundary for runtime/tags/reactive/debug without cycles.                                                                                                                                                | No README, special `library:interfaces`, stale-looking `src/protocol.ts`, stale `@domtree/any` manifest dependency, broad declaration leakage.                                                       | Decide whether protocol types are public. Consider a better public `@starbeam/protocol` surface or re-export strategy.                    |
| `@starbeam/tags`       | Decision needed                                                                | Validation/tag substrate extracted from runtime; core of demand-driven validation.                                                                                                                                             | Low-level implementor API, not normal app-user API.                                                                                                                                                  | Bless as implementor API or hide behind `reactive`/`runtime`.                                                                             |
| `@starbeam/runtime`    | Decision needed                                                                | Runtime coordination, subscriptions, finalization scopes; intentionally split from reactive primitives.                                                                                                                        | README says stable for libraries but not app code; public exports are low-level.                                                                                                                     | Decide whether runtime/library authors are supported. Refresh docs if public.                                                             |
| `@starbeam/reactive`   | Public primitive surface, needs split                                          | Primitive reactive values are documented and useful to library authors.                                                                                                                                                        | Exports include runtime wiring/debug/tracking-frame substrate, not just public primitives.                                                                                                           | Keep public for primitives. Move/hide runtime wiring and tracking internals behind internal or future author-facing surfaces.             |
| `@starbeam/universal`  | Main public umbrella candidate                                                 | Best current framework-agnostic entrypoint over cells, formulas, resources, and common integration concepts.                                                                                                                   | Leaks low-level package names in JS and declarations; service docs conflict with exports.                                                                                                            | Make it the public umbrella over private substrates. Re-export service if public; stop exposing raw runtime/protocol pieces as the story. |
| `@starbeam/core`       | Compatibility decision                                                         | Deprecated alias over `@starbeam/universal`.                                                                                                                                                                                   | Root badge still points at it, but code is only a warning + re-export.                                                                                                                               | Decide old-import compatibility policy for 0.9.                                                                                           |

### Lifecycle package audience matrix

PER6a creates the decision interface for lifecycle-oriented packages. It does
not settle final public/private status.

| Package               | App authors                                  | Library authors               | Framework adapter authors            | Runtime/protocol implementors  | Internal maintainers                  | PER6a disposition                                                |
| --------------------- | -------------------------------------------- | ----------------------------- | ------------------------------------ | ------------------------------ | ------------------------------------- | ---------------------------------------------------------------- |
| `@starbeam/resource`  | Likely direct API                            | Likely direct composition API | Building block for adapter APIs      | Not primary                    | Maintain docs/API vocabulary          | Keep as public candidate; clarify audience in 6b.                |
| `@starbeam/service`   | Low-level direct API; adapter APIs preferred | Low-level app-scoped API      | Used by renderer/adapter lifetimes   | Not primary                    | Adapter support and lifecycle wiring  | PER6c: keep public low-level kernel; no universal re-export yet. |
| `@starbeam/modifier`  | No direct API currently                      | No direct API currently       | Historical element-attachment kernel | Not primary                    | Cleanup/deprecation candidate         | Keep internal candidate; cleanup decision moves to 6e.           |
| `@starbeam/universal` | Umbrella candidate                           | Umbrella candidate            | May re-export shared concepts        | Should not expose raw protocol | Own public framework-agnostic story   | Move umbrella shape decision to 6d.                              |
| `@starbeam/renderer`  | Not direct API                               | Not direct API                | Primary adapter-author kit           | Possible implementor boundary  | Own shared setup/finalization kernels | Confirm adapter-author boundary in 6f.                           |

Current conflicts to preserve for later PERs:

- `@starbeam/resource` README conflict resolved in PER6b: docs now describe the
  current `Resource()` / `setupResource()` API and sync/finalization semantics.
- `@starbeam/service` README conflict resolved in PER6c: service remains a
  public low-level app-scoped kernel over resources. Primary app-facing APIs are
  the framework adapter APIs. `@starbeam/universal` still does not export
  service; deciding whether it should re-export service belongs to PER6d.
- `@starbeam/modifier` is repo-private and has no production consumers, but the
  npm package exists historically; registry deprecation is separate from repo
  cleanup.
- `@starbeam/universal` is the umbrella candidate, but its current lifecycle
  exports are partial. PER6d owns the universal umbrella shape.
- `@starbeam/renderer` is the adapter-author kit. It should not become the
  app/library umbrella to resolve lifecycle package placement.

**What PER6a does not decide:** final package deprecations, export moves,
manifest changes, generated artifact changes, or package README rewrites. Those
belong in later PER6 sub-arcs after the audience matrix is explicit.

### Modifier / DOM attachment decision frame

Direct imports of `@starbeam/modifier` are not the decision heuristic. The
question is whether Starbeam has a public DOM attachment concept that should be
stable, documented, and shared across adapters.

Current decision: **public concept, renderer setup primitive, adapter-local
dialects**. The public concept is element attachment for framework reactivity: a
framework obtains an element, Starbeam runs resource-backed work for that element,
and cleanup follows the framework's element/component lifetime. `@starbeam/renderer`
now owns the shared adapter-author setup/finalization primitive for Vue/Svelte
style element-first lifetimes. `@starbeam/modifier` and `@domtree/*` remain
internal unless a later PER finds a stable adapter-author contract that needs
those package boundaries directly.

Other live possibilities:

- **Public adapter-author kit:** a stable DOM-integration package or renderer
  extension for third-party adapters.
- **Internal implementation only:** official adapters eventually implement the
  concept privately without exposing a shared public API.
- **Stale boundary:** the current modifier package shrinks or disappears if the
  old concept no longer matches the active adapter story.

Current evidence: `@starbeam/react` and `@starbeam/preact` both expose
`useElementResource`, with matching local `ElementResource` /
`ElementResourceBlueprint` shapes: a function from `element` to
`IntoResourceBlueprint<T>`, plus a `pending | attached` result that always
carries the framework callback ref. Vue adds the non-hooks version of that
evidence: `@starbeam/vue` exposes `elementResourceDirective`, whose custom
directive owns the resource lifetime for an element, subscribes to runtime
invalidations, schedules sync through Vue, and finalizes when the element
unmounts. Svelte adds the attachment dialect and now shares the renderer setup
primitive with Vue. This is stronger evidence for a shared Starbeam DOM
attachment concept than the earlier React-only probe. `@starbeam/modifier` still
only exposes `ElementPlaceholder`, which models element availability but not the
resource-shaped public contract.

#### DOM attachment contract sketch

**Vocabulary**

- **DOM attachment** is the public concept: Starbeam coordinates
  framework-created DOM elements with reactive/resource work.
- **Element attachment** is one concrete lifetime of one element supplied by a
  framework.
- **Refs, directives, and modifiers** are framework dialects for delivering an
  element. They are not the stable Starbeam contract name.
- `@starbeam/modifier` and `@domtree/*` remain internal candidates unless a
  later PER finds that adapter authors need those package boundaries directly.

**Minimal state model**

- `pending`: the adapter has not supplied an element yet. Element-backed work
  has not started.
- `attached`: the adapter supplied an element, and Starbeam has produced
  element-backed resource state with cleanup registered to the framework
  lifetime. This does not imply that `on.sync` work has run.
- `cleaned-up`: the attachment lifetime ended. Observers, subscriptions, and
  resource scopes tied to that element have been released. A later element is a
  new attachment lifetime.

Avoid using `detached` as the core state until we decide how it relates to
React hidden trees, Vue deactivation, and element replacement. Use
`deactivated` only for framework/component lifecycle.

**Framework timing**

- React is the hard case. The API must let React declare the element-backed
  resource at top-level hook position while the actual element arrives after
  render through ref/commit timing. Resource work must wait for React's paired
  setup/cleanup phase.
- Preact can use the shared renderer manager shape, but an element API still
  needs to define how the element arrives and how replacement is represented.
- Vue component setup/resource timing can use the shared manager shape. Vue
  directives supply the element around mount/unmount, and
  `elementResourceDirective` owns an element-backed resource lifetime. Vue
  deactivation remains a separate question.

**Boundary candidates**

- Official framework adapters expose idiomatic APIs first.
- `@starbeam/renderer` may grow adapter-author vocabulary if third-party
  adapters need it.
- `@starbeam/universal` may document the framework-neutral concept if
  app/library authors need to talk about element resources directly.
- A new package is only justified if the concept becomes independently
  installable.
- No public API yet remains a valid outcome for 0.9.

**React findings from #200 and #201**

The React probes support the current "public concept, internal kernel"
hypothesis without adding a public API or importing `@starbeam/modifier` /
`@domtree/*`.

- Before React supplies a ref, the element-backed resource can be declared but
  returns `pending`.
- After a ref-driven rerender, the resource can return `attached`.
- Strict Mode performs a ref attach/cleanup/reattach sequence before the stable
  attached state.
- On final unmount, the resource finalizer runs before React calls the ref
  cleanup.
- `attached` render state is not a sync/ready boundary. The attached resource's
  `on.sync` handler has not necessarily run.
- Marking a value that would only be read by the not-yet-run `on.sync` handler
  does not bootstrap first sync.

Next implementation work should treat element attachment and sync scheduling as
separate problems. A later API may choose to expose a ready/synced boundary, but
the current evidence does not justify adding a public state name yet.

**React / Preact convergence after #205-#209**

React and Preact now independently expose the same leaf API shape:

- `ElementResourceBlueprint<E, T>` is `(element: E) => IntoResourceBlueprint<T>`.
- The returned `ElementResource<T, E>` is either `pending` or `attached`.
- Both states carry the adapter callback ref.
- `attached.current` is the value produced by the element-backed resource.

This supports the hypothesis that Starbeam has a universal resource-shaped DOM
attachment concept. It does not yet prove that `@starbeam/modifier` should be
public. React and Preact keep their adapter-local result shapes because their
timing is hook/resource-lifecycle specific.

**Vue directive findings from #211 and #215**

Vue proves that a non-hooks dialect is feasible. `@starbeam/vue` now exposes
`elementResourceDirective`, a custom directive factory that can own an
element-backed resource lifetime directly:

- `mounted` receives the element and creates the resource scope.
- The probe uses `Resource` and `setupResource` from `@starbeam/resource`, with
  `pushingScope` from `@starbeam/runtime` to own cleanup.
- Runtime invalidations subscribe through `RUNTIME.subscribe` and schedule
  `sync()` through Vue `nextTick`.
- Cleanup is per element with a `WeakMap`, and `unmounted` unsubscribes and
  finalizes the scope.
- Marking after unmount does not resync the finalized resource.

The directive probe also shows that the component-centered `@starbeam/vue`
`setupResource` path is not the right mechanism inside directive hooks.
Directive hooks do not have setup-time `getCurrentInstance()` context, so a Vue
element-attachment API needs a directive-owned lifetime path rather than the
component setup path.

**Renderer setup primitive after #223**

Vue and Svelte now share `@starbeam/renderer`'s `setupElementResource()` helper.
The helper owns only the Starbeam setup/finalization kernel: it turns an element
and `ElementResourceBlueprint` into `{ value, sync, finalize }`. Vue and Svelte
still own their framework-local concerns:

- element delivery (`directive` vs. `{@attach}`);
- runtime invalidation subscription;
- sync scheduling (`nextTick` vs. `queueMicrotask`);
- publication (`ShallowRef`/`triggerRef`, callback sinks, or Svelte stores);
- cleanup timing and element replacement semantics.

This closes the basic package-boundary question for Vue/Svelte setup without
promoting `@starbeam/modifier` or forcing React/Preact onto the same helper.

**`ElementPlaceholder` reconciliation**

`ElementPlaceholder` is the current internal artifact in `@starbeam/modifier`.
It is a reactive placeholder for an element: `current` is `null` before
initialization, `initialize()` verifies the element constructor in DEV, and
initialization freezes the underlying cell. That overlaps with the first step of
DOM attachment: the framework supplies an element later. It is not the same
abstraction as `ElementResourceBlueprint`.

The proven adapter shape is resource-shaped. Once an element exists, Starbeam
runs an `IntoResourceBlueprint<T>` for that element and ties cleanup to the
framework lifetime. `ElementPlaceholder` does not encode `pending | attached`,
resource setup, `on.sync` timing, cleanup, or element replacement. Treat it as
internal historical kernel evidence, not as the public API shape.

## Private packages with cleanup debt

These packages are private. Some still have source-level cleanup work, but they
do not appear in public runtime dependency fields, public generated JavaScript,
or public generated declarations.

| Package                | Hypothesis | Why                                                                                               | Main blockers                                                                                                  | Suggested PER                                                                                                 |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@starbeam/verify`     | Private    | Internal assertion/type-narrowing support. A tidy API is not a public-package argument by itself. | Done: private/internal, inlined in public artifacts, no public runtime manifest leaks.                         | Monitor verifier; no public surface unless a real audience appears.                                           |
| `@starbeam/debug`      | Private    | Dev/runtime support and bootstrap implementation, not a direct install target.                    | Done: private/internal; `@starbeam/universal` owns and verifies the public DEV bootstrap.                      | Keep `test:workspace:debug-bootstrap` green; revisit only if a public diagnostics story appears.              |
| `@starbeam/core-utils` | Private    | Generic JS utilities are not a Starbeam public goal by default.                                   | Done: private/internal; public JS/declarations are clean, while dev metadata and source maps still mention it. | Keep private. Treat remaining references as source-map/provenance policy and low-level consolidation cleanup. |

## Possible new public surfaces

Creating new packages is allowed if it makes the public story clearer.

| Possible package                                         | Purpose                                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@starbeam/universal` as umbrella                        | Main user/library surface over cells, formulas, resources, services, and common integration concepts.                                   |
| `@starbeam/protocol`                                     | Future explicit protocol/type package if runtime/framework authors become a supported audience. Better name than `interfaces`.          |
| `@starbeam/reactivity` or clarified `@starbeam/reactive` | Public primitive reactive values, separated from runtime wiring and tracking-frame internals if needed.                                 |
| `@starbeam/renderer`                                     | Adapter-author kit. The #190-#195 hardening arc completed the initial docs, contract tests, and artifact checks for the public surface. |

## Suggested Prepare / Execute / Review (PER) order

PER means Prepare / Execute / Review: prepare a falsifiable plan, execute the
bounded change, then review the result against the prediction.

1. ~~Tighten release-surface verification so generated declarations and default
   JS cannot hide private-package leaks.~~ Done.
2. ~~`@starbeam/verify` and `@starbeam/debug` strategy.~~ Done: both are
   private/internal, with debug bootstrap covered through `@starbeam/universal`.
3. ~~`@starbeam/core-utils` surface decision.~~ Done: private/internal with
   public runtime dependency fields, JS, and declarations clean. Remaining
   dev metadata, source-map, and source-level references are cleanup debt for
   low-level surface consolidation.
4. Modifier / DOM attachment reconciliation. Done so far: React + Preact
   convergence, the `ElementPlaceholder` comparison, the Vue directive probe,
   the [DOM attachment boundary decision](./DOM-ATTACHMENT-BOUNDARY.md), the
   Svelte attachment experiment, the Vue handle experiment, and the renderer
   setup primitive. Keep official adapter APIs as the 0.9 public surface. The
   [DOM attachment ergonomics review](./DOM-ATTACHMENT-ERGONOMICS.md) now frames
   remaining work as API polish and future expansion beyond setup/finalization,
   not basic boundary discovery.
5. Low-level surface consolidation: make `@starbeam/universal` the umbrella,
   split public `@starbeam/reactive` primitives from runtime wiring, place
   service intentionally, and target interfaces/tags/runtime as internal unless
   a future protocol package is needed.
6. Audience decision matrix for app users, library authors, framework
   contributors, and runtime/protocol implementors.
7. ~~Renderer hardening PER series.~~ Done: #190-#195 established the
   adapter-author kit story, including surface taxonomy, manager contracts,
   React's resource boundary, service/app lifetime, dependency artifacts, and
   the final public decision.
8. Public-consumption polish for `@starbeam/use-strict-lifecycle` and
   `@starbeamx/*`.
9. `@starbeam/core` compatibility alias policy.
