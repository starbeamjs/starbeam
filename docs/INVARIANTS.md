# Starbeam Invariants

These are the load-bearing properties of Starbeam. No simplification, refactor, or
redesign may break one without an explicit decision to revise the invariant itself.

This document is the rubric. Consult it before any change that touches reactive
semantics, the adapter surface, or the primitives.

---

## 1. Mark root state. The rest is Just JavaScript.

The reactive boundary is at the _storage_. Cells, markers, and reactive
collections are reactive. Functions, classes, getters, methods, closures, and
data passed through normal collection APIs are not — they're ordinary code
that happens to read and write reactive state.

There is no "derived state" type, no "computed property" decorator, no graph of
observables to register. To derive a value from reactive state, you write a
function.

Because the boundary lives at the storage, abstractions on top work without
knowing they're reactive. A reactive `Map` really is a `Map`. A class with
private fields really is a class. A formula is just a function. A library
author doesn't "make their abstraction reactive" — if the root state is
reactive, reading through any abstraction is reactive.

**User code runs in two modes.** Outside rendering — event handlers, effects,
async continuations, plain function calls — read and write freely. Reactive
state behaves like ordinary state. Inside rendering — the frame during which a
component produces its UI — read freely; writing is disallowed. That's the
only rule.

Section 14 defines what counts as "rendering" in the React adapter. Other
adapters define the equivalent for their host.

---

## 2. No ambient container is required

Reactive values don't need to be registered anywhere to work.

A cell created anywhere in the program is reactive from the moment it exists.
A formula that reads cells captures their tags on evaluation. Consumption
happens through the cell's tag, not through any ambient container or store.
No `<Provider>` is required. No store must be constructed and passed down
through context.

This is a corollary of sections 1 and 4 — there is no graph to register into,
because there is no graph. It's named separately because it's the first
visible difference for anyone arriving from jotai or Redux.

**Services are the exception that tests the rule.** A service is a reactive
value whose lifetime exceeds any single component's. Something has to own
that lifetime, and in React that something is the `<Starbeam>` component — not
because reactivity needs it, but because a service needs an app-scoped
finalization boundary. Reads and writes of plain reactive state work identically
with or without `<Starbeam>` in the tree. Only code that depends on services
requires it.

---

## 3. The Iron Rule: validation is metadata, never data

Validation answers "is this cached result still good?" Starbeam answers without
running user code.

Every reactive value has a _tag_. Every tag has a _revision_ (a monotonic
number, or, for frozen values, none). To validate a previously-computed result,
the system compares revisions — integers — and nothing else.

The cost of validation is:

    O(|T|) revision comparisons, where T is the trace of the computation.

A formula that read five cells last time costs five integer comparisons to
validate, no matter how expensive the computation itself was or how many
layers of abstraction the reads passed through. Validation is bounded
independently of computation cost, and cheaper. That's what makes caching
composable at any granularity — adding a cache doesn't introduce a
performance cliff, because the cache check is always cheap.

**The Iron Rule forbids one specific optimization: output-equality cutoff on
cached computations.** If a cached computation would re-run in order to check
whether its new output equals the previous output, that re-run is a data
operation. It ran user code to decide whether to invalidate. Forbidden.

Equality checks aren't banned — they're only banned where they require running
user code at validation time. At the cell, a custom `equals` runs at _write_
time: if the caller hands in a value equivalent to the current one, the cell
declines to bump its revision. Downstream never sees a change, and no
validation cost was paid. That's metadata. Equality at the computed, by
contrast, would require evaluating the computation to learn its output — that's
data, and it breaks the cost guarantee above.

---

## 4. No dependency graph

Starbeam is not a DDG-based reactive system. There is no persistent graph of
"reactive nodes" to manage, no edges to maintain, no registration of derived
values into a shared structure.

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

A function that calls another function that reads a cell contributes the cell
to the outer trace, transparently. The intermediate function is erased from
the reactive structure, as if the outer function had read the cell directly.

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
applies to reactive `Map` and `Set`: a subscriber that retained entries would
turn "I rendered this list once" into a lifetime commitment.

This property is a corollary of sections 4 and 5 (no graph, no formula
identity), but it is load-bearing for the promise that reactive collections
share an interface with their standard counterparts. The gut-check: **if
reactive `WeakMap` can be implemented correctly, the invariant holds; if it
can't, something has gone wrong.**

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

Use `Formula` when your computation might read reactive state outside
Starbeam. `CachedFormula` caches across reads; `Formula` doesn't. If every
dependency is a Starbeam cell, `CachedFormula` is faster. If any is a React
ref or a Vue signal, `Formula` is correct.

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
nest. Framework adapters hand a component's lifetime to Starbeam as an owner
— no framework-specific machinery needed in the core.

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
external contract that set of primitives implies.

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

Starbeam's core primitives map onto the TC39 Signals proposal: cells onto
`Signal.State`, cached formulas onto `Signal.Computed`, watchers onto
`Signal.subtle.Watcher`. Shared primitives mean shared portability — code
written against Starbeam's cell and formula APIs can move to Signals
with minimal reshaping when Signals ship.

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

## Known deviations

Places where the current implementation is known to fall short of an
invariant above. These are open debts against the rubric, not
relaxations of it. A deviation here is a commitment to close the gap —
or to update the invariant with an explicit decision if the gap turns
out to be structural.

### `isRendering()` reaches into React internals (against §13)

`@starbeam/use-strict-lifecycle`'s `isRendering()` checks whether the
current call is inside React's render phase. The current implementation
reads `__CLIENT_INTERNALS.H` (React 19's internal dispatcher slot),
wrapped in `try/catch` so a future rename falls through to a safe
default.

§13 says adapters use only public host APIs. This one doesn't. The
public primitives React exposes — `useEffect`/`useLayoutEffect` timing,
strict mode, `<Activity>` — don't carry a synchronous "am I rendering
right now?" signal, so the adapter reads from the dispatcher directly.

The plan: either React exposes a public "am I rendering?" primitive and
the adapter migrates to it, or the adapter finds a way to infer the
phase from public primitives alone. Until then, this is a deviation.

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
