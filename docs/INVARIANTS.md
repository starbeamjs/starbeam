# Starbeam Invariants

These are the load-bearing properties of Starbeam. No simplification, refactor, or
redesign may break one without an explicit decision to revise the invariant itself.

This document is the rubric. Consult it before any change that touches reactive
semantics, the adapter surface, or the primitives.

---

## 1. Reactivity is a root, not a paradigm

Mark what state is reactive. The rest is plain JavaScript.

Reactive state lives in cells, markers, and reactive collections. Everything
else — functions, classes, getters, methods, closures, data passed through normal
collection APIs — is ordinary code that happens to read and write that state.

There is no "derived state" type, no "computed property" decorator, no graph of
observables to register. To derive a value from reactive state, you write a
function.

This isn't an aesthetic choice. It's a structural property. Because the reactive
boundary lives at the _storage_, abstractions built on top work without knowing
they're reactive: a reactive `Map` really is a `Map`; a class with private fields
really is a class; a formula is just a function. There is nothing for a library
author to do to "make their abstraction reactive." As long as the root state is
reactive, reading through any abstraction produces reactive reads.

The single rule user code must follow: **during rendering, don't mutate reactive
state.** During actions — event handlers, effects, async continuations — read
and write freely. Nothing else is required.

---

## 2. No ambient container is required

Reactive values don't need to be registered anywhere to work.

A cell created anywhere in the program is reactive from the moment it exists.
A formula that reads cells captures their tags on evaluation. Consumption
happens through the cell's tag, not through any ambient container or store.
No `<Provider>` is required. No store must be constructed and passed down
through context.

This is a corollary of sections 1 and 4 (there is no graph to register into,
because there is no graph), but it's worth naming because it's the first
visible difference to anyone arriving from a store-based library such as jotai
or Redux.

The React adapter does provide a `<Starbeam>` component. Its role is strictly
to supply an app-level finalization scope for services, not to enable
reactivity. Reactive reads and writes work equivalently whether the component
tree is wrapped in `<Starbeam>` or not. Services that require an app-level
lifetime require `<Starbeam>`; plain reactive state does not.

---

## 3. The Iron Rule: validation is metadata, never data

Validation answers "is this cached result still good?" Starbeam answers without
running user code.

Every reactive value has a _tag_. Every tag has a _revision_ (a monotonic
number, or, for frozen values, none). To validate a previously-computed result,
the system compares revisions — integers — and nothing else.

The cost of validation is:

    O(|T|) revision comparisons, where T is the trace of the computation.

The cost of the computation itself is whatever the user wrote. Validation cost
is bounded independently of, and cheaper than, computation cost. This is the
property that makes caching composable at any granularity: there is no
performance cliff when adding a cache, because checking the cache is always
cheap.

One direct consequence deserves to be named explicitly: **Starbeam does not
permit output-equality cutoff for derived computations.** If a cached
computation would re-run to check whether its output equals the previous output,
that re-run is a data operation, and it is forbidden.

To skip propagation when a value is semantically unchanged, store the output in
a cell with a custom `equals` function. The cell-level `equals` check runs at
write time and prevents the revision bump if the new value is equivalent. That
is metadata. Output-equality cutoff on a computed is not.

---

## 4. No dependency graph

Starbeam rejects Dynamic Dependency Graphs as an architectural choice. There is
no persistent graph of "reactive nodes" to manage, no edges to maintain, no
registration of derived values into a shared structure.

What exists:

- **Cells.** Have identity, revisions, and (when observed) subscribers.
- **Functions.** Ordinary functions. When called, they read whatever cells they
  read _this time_.

What doesn't exist:

- Derived values as entities in a graph.
- Edges between cells and the functions that use them.
- Any data structure that the user, or the library, must reason about as a graph.

The only bookkeeping the system performs is a per-evaluation _trace_: during a
reactive read, a tracking frame records which cells were touched. When the frame
closes, the trace is a flat set of tags. That set is used to validate the result
and, when rendering, to bind the component's lifetime to those cells. The trace
is not persistent; it belongs to the evaluation that produced it.

When a function stops being called, its closure is garbage. There is nothing
else to clean up.

---

## 5. Formulas have no identity

A formula is a function. It is not a node.

The same function, evaluated twice in different contexts, produces two traces.
Those traces may differ. The formula did not "change its dependencies" — it
doesn't have dependencies, because it doesn't persist. Each call produces its
own trace.

Call this property _trace flattening_. A function that calls another function
that reads a cell contributes the cell to the outer trace, transparently. The
intermediate function is erased from the reactive structure, as if the outer
function had read the cell directly.

Two consequences follow:

1. Anonymous closures, iterators, map/filter callbacks, and all other ephemeral
   computations are first-class in Starbeam. They participate in reactivity
   without needing to be registered.
2. `CachedFormula` is a separate construct precisely because _caching_ requires
   identity. The cache is an object. The function is not.

---

## 6. Subscriptions are weak; unobserved reactive values are garbage

Subscriptions hang off cell tags, not off formulas. When a component or other
consumer stops observing a cell, its entry in the cell's subscriber set is
dropped. There is no cleanup obligation on the formula or on the reading code:
the closure is simply garbage.

Symmetrically, a cell does not prevent the garbage collection of anything that
would otherwise be collectable. Reactive `WeakMap` and `WeakSet` are only
possible under this property: the per-key markers they create must not retain
the key, or the weak-collection semantics are destroyed. The same reasoning
applies, less visibly, to reactive `Map` and `Set` — a subscriber that retained
entries would turn an innocuous "I rendered this list once" into a lifetime
commitment.

This property is a corollary of sections 4 and 5 (no graph, no formula
identity), but it is load-bearing for the promise that reactive collections
share an interface with their standard counterparts. The gut-check: **if
reactive `WeakMap` can be implemented correctly, the invariant holds; if it
can't, something has gone wrong.** A simplification that introduces a data
structure which strongly retains observers or observees has eroded this
invariant — and has made `reactive.WeakMap` and `reactive.WeakSet` impossible
to implement.

---

## 7. Revisions are strictly equal, or they're not equal

A revision matches if, and only if, it is identical to the one recorded in the
trace. There is no partial ordering, no "close enough," no range check.

Revisions are epoch-scoped: they include an identifier for the current
process/runtime, so a revision from a previous instantiation is never valid in
a new one. This prevents reincarnation bugs when state is reconstructed.

---

## 8. Cells update immediately and atomically

`cell.set(x)` takes effect before `set` returns. Any reader that accesses the
cell afterward sees the new value. There is no batching built into the core
model.

A framework adapter may batch _renders_. It does not batch _writes_. A write
bumps the revision immediately; downstream `CachedFormula`s see the new revision
the next time they're read.

"Atomic" here means one cell's value changes as a single operation. For
structured state that needs finer granularity, use reactive collections (which
have their own per-key markers) or compose multiple cells.

---

## 9. `Formula` and `CachedFormula` are distinct primitives

Both are reactive values. They differ in when they re-evaluate:

- **`Formula(fn)`**: re-evaluates every time it is read. Use when the computation
  is cheap, or when it may read from reactive state external to Starbeam (such
  as another framework's reactivity). Subscribers see updates whenever any
  dependency — including dependencies that change _across_ evaluations — changes.
- **`CachedFormula(fn)`**: re-evaluates only when a dependency from its previous
  evaluation has changed. Use for expensive computations with stable-enough
  dependency sets.

`Formula` is the right default in mixed-reactive environments. `CachedFormula`
is an optimization, not a semantic change, for pure-Starbeam computations.

Both obey the Iron Rule. Neither uses output-equality cutoff.

---

## 10. `Sync` makes external state reactive

State that lives outside Starbeam — browser APIs, third-party stores, the DOM
itself — becomes reactive through `Sync`. A `Sync` follows a five-step pattern:

1. **Set up internal reactive state** to mirror the external state.
2. **Subscribe to change events** from the external source.
3. **On change, update the internal state.** This bumps a cell, which
   propagates through the reactive system normally.
4. **Expose a public API** that lets consumers read the current state.
5. **On dispose, disconnect the listener.**

`Sync` is the only place in user code that bridges external-to-reactive. Once
an external change has landed in a cell, the rest of the program is ordinary
Starbeam.

---

## 11. Resources link lifetime and assimilate reactive returns

A resource is a reactive value with setup and cleanup.

A resource constructor runs once per resource instance. It sets up internal
state, registers cleanup, and returns a value. The returned value is the
resource's _instance value_.

**Assimilation.** If the instance value is itself a reactive value (a cell, a
formula, another resource), the resource _is_ that reactive value. Reading the
resource reads the assimilated value. This is the property that makes resources
composable: a resource that returns a formula composes with downstream consumers
as though it were the formula.

**Lifetime.** A resource is instantiated with an owner. When the owner is
finalized, the resource's cleanup runs. Owners are finalization scopes; scopes
nest. This is the mechanism that connects reactive cleanup to framework
lifetimes without the framework needing to know about Starbeam's internals.

---

## 12. The core is framework-agnostic. Adapters are thin.

The universal core exposes reactive values and finalization scopes. It does not
know about React, Vue, Preact, or any specific framework.

A framework adapter does two things:

1. **Binds framework lifetime to cell-tag subscriptions.** When a
   component-equivalent unit in the framework is created, its reactive reads are
   subscribed to cell tags. When that unit is finalized, the subscriptions drop.
2. **Provides idiomatic entry points.** `useReactive` in React, automatic
   tracking in Vue, etc.

An adapter must not leak framework concepts into the core. If a simplification
moves a framework-specific concern — scheduler semantics, rendering phase,
component identity — into universal code, it has eroded this property.

---

## 13. Adapters rationalize the host's contract; they don't reach inside

An adapter uses only public host APIs. It does not patch internals, drive
private schedulers, or depend on implementation details of the host framework.

What an adapter _does_ is give names to the implicit lifecycle that the host's
contract implies, so that reactive state can be bound to those named points from
outside. For React, the implicit lifecycle that strict mode telegraphed — and
that React 19's `<Activity>` has now formalized — is the one Starbeam names as
**activate / attach / ready / deactivate**.

This is rationalizing out, not reaching in. The host reserves the right to
mount, unmount, hide, show, and remount however it likes; the adapter's job is
to survive all of that correctly, using only primitives the host has sanctioned.

---

## 14. The React adapter's lifecycle

A component in the React adapter proceeds through four named lifecycle points:

- **activate** — the component has a fresh reactive identity. Setup functions
  run. Fires on initial mount and again on every remount (strict-mode remount,
  `Activity` reveal, fast refresh).
- **attach** — the component is in the DOM and effects are eligible to run.
  Layout-timing work is registered here.
- **ready** — effects have run; the component is idle.
- **deactivate** — the component's reactive identity is being torn down.
  Cleanup runs. Fires on unmount, strict-mode unmount, and `Activity` hide.

React does not publish these terms. It publishes `useEffect`/`useLayoutEffect`
timing, strict mode, and (now) `Activity`. Starbeam's lifecycle names are the
coherent external story implied by those primitives.

Where React has published terms that align, the adapter uses them. `Activity`'s
"hidden" state _is_ a deactivation from Starbeam's perspective; "visible" again
is an activation. User code does not need to distinguish "unmount" from
"`Activity` hide" — from the user's point of view, the component was
deactivated, and the next time it appears it will be freshly activated.

---

## 15. Lifetime is correct across every kind of remount

Setup runs once per logical activation. If React destroys and recreates a
component's effects — for strict mode, `Activity`, fast refresh, or any future
reason — the adapter treats the recreation as a new activation: cleanup runs,
setup runs again, a fresh reactive identity is produced.

This is non-negotiable. A user's setup function must be allowed to allocate,
subscribe, and own resources on the assumption that cleanup will fire exactly
when the identity is torn down, and that a subsequent activation will start from
nothing.

---

## 16. Alignment with TC39 Signals, with one named divergence

The core primitives of Starbeam — cells (`Signal.State`), cached formulas
(`Signal.Computed`), watchers (`Signal.subtle.Watcher`) — map onto the TC39
Signals proposal. `starbeam-lite` demonstrates the minimal surface by porting
the proposal's tests directly.

This alignment is strategic. If Signals ship, Starbeam's core becomes a thin
layer over a platform primitive, and the adapters remain Starbeam's
contribution.

**One divergence is named explicitly.** The TC39 proposal permits a computed
signal to use output-equality as a cutoff: when a dependency changes, the
computed may re-run, discover its output equals its previous output, and
propagate "clean" to downstream sinks. This violates the Iron Rule: validation
has run user code.

Starbeam rejects this behavior for cached computations. Output-equality belongs
at the cell level, where it applies at write time and prevents the revision
bump. An adapter that builds on `Signal.Computed` directly must be aware of this
divergence and either disable output-equality cutoff or document that
computations using it have given up metadata-only validation for that node.

---

## 17. Simplification is measured against these invariants

A change that violates an invariant without an explicit decision to revise the
invariant is a regression, regardless of how much code it removes.

When in doubt: the invariants are load-bearing. The code is not.

---

## Scope commitment: multi-framework

Not an invariant about semantics — a commitment about the project's shape.

Starbeam's universal core and its framework adapters are both first-class.
Preact, Vue, and future adapters are as much citizens of the project as React.
A change that would simplify the universal core by specializing it for
React — or by requiring React-specific concepts to exist in universal
packages — is out of scope for this effort, even if the React integration
would benefit.

If the cost of this commitment ever becomes load-bearing against the other
invariants, the commitment gets reconsidered explicitly, not eroded by
accretion.
