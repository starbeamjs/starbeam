# Starbeam Positioning

This memo captures the public story we want the documentation website to teach.
It is not website copy yet. It is the constraint system for writing website copy
without getting pulled into implementation details too early.

## Audience

The first docs pass should primarily persuade **app authors**.

Library authors, adapter authors, and implementors matter, but they should not
shape the first-run path. The first-run path should make an app author feel that
Starbeam lets them write ordinary JavaScript while still getting reliable
reactivity and lifecycle integration.

## Core thesis

> Mark root state. The rest is just JavaScript.

Starbeam's core idea is that the reactive boundary lives at storage. Cells,
markers, and reactive collections are reactive. Functions, classes, getters,
methods, closures, and domain objects above that storage remain ordinary
JavaScript.

This means users can build abstractions that look like their domain:

- `session.user`, not `session.user.current`;
- `size.width`, not `size.width.current`;
- `form.isValid`, not `form.isValid.current`.

The abstraction becomes reactive because it reads reactive storage internally,
not because every layer of the abstraction has to become a reactive type.

## Supporting technical claims

The homepage does not need to lead with the internals, but the internals explain
why the thesis holds.

### Validation is metadata, not data

Starbeam validates cached work by comparing tag revisions. It does not rerun user
code just to decide whether cached work is still valid.

That gives Starbeam a strong claim:

> caching can be composed at any granularity because validation is cheap and
> bounded by the previous read trace.

This is supporting evidence for the public story. It should appear in core
concepts and advanced docs, not as the first sentence of the homepage.

### There is no dependency graph to manage

Starbeam does not ask users to register a graph of derived values. A function
that reads reactive storage captures a trace when it runs. That trace validates a
cached result or drives a renderer subscription. It is not a persistent userland
graph.

The public point is simpler: users write ordinary functions and methods.

### No ambient container for ordinary state

A cell is reactive from the moment it exists. Plain reactive state does not need
a provider, store, owner, or app container.

This is an important contrast with many app-state tools, but it should be framed
carefully. Starbeam still has app-scoped lifetimes for services. The distinction
is:

- ordinary reactive state does not need an ambient owner;
- app-scoped services do need an app lifetime;
- resources attach setup, sync, and cleanup work to an owner when lifecycle is
  the thing being modeled.

## Lifecycle as a differentiator

Starbeam is not only a state primitive. Its lifecycle model is part of the value
proposition.

The docs should lean into lifecycle enough to show why Starbeam is meaningfully
different from simpler state tools, without making the first-run model feel
heavy.

The lifecycle story should be:

1. Start with ordinary reactive state.
2. When state needs setup, sync, or cleanup, wrap that work in a `Resource`.
3. Framework adapters connect resources to the framework's lifecycle.
4. Services are resources with an app-scoped lifetime.
5. Element resources attach reactive/resource work to DOM elements supplied by a
   framework.

This gives the docs an emotional payoff: Starbeam starts as ordinary JavaScript
state, then scales into lifecycle-aware abstractions when the app needs them.

## What Starbeam is not

These are useful negative boundaries for docs authors. They do not all belong in
user-facing copy.

- Starbeam is not a global store you must put everything into.
- Starbeam is not a dependency-graph API that asks users to register nodes and
  edges.
- Starbeam is not a framework replacement.
- Starbeam is not just a signals clone.
- Starbeam is not only an Ember idea extracted into a package.
- Starbeam is not a lifecycle framework users must understand before writing
  reactive state.

## Ember and autotracking lineage

The Ember lineage is real and useful context, especially because Starbeam comes
from the same person and design lineage as Ember's autotracking work.

It should be visible, but not the main pitch.

Recommended placement:

- brief mention in the homepage or about page;
- fuller history section later;
- not required background for first-run users.

The point is credibility and design lineage, not that Starbeam is only for Ember
users.

## Relationship to signals

Signals should not drive the first-run docs.

The public stance should be:

- Starbeam is compatible with signals, or intended to be compatible where that
  work is not complete yet;
- Starbeam is adjacent to signals, but has its own model and goals;
- comparisons belong in advanced material, not the homepage.

Avoid making the docs a response to signals. Teach Starbeam on its own terms.

## Homepage narrative

The homepage should make this progression feel obvious:

1. You can mark root state reactive.
2. Everything above that state stays normal JavaScript.
3. Derived reads and cached formulas work through ordinary functions.
4. Resources add setup, sync, and cleanup when lifecycle matters.
5. Framework adapters connect this model to React, Preact, Vue, and Svelte.

The homepage should not start with:

- protocol tags;
- runtime internals;
- package-surface decisions;
- historical Ember details;
- signal comparisons;
- adapter-author concepts.

## Terms to prefer

Use these terms consistently in website copy:

- **root state** for the marked reactive storage boundary;
- **ordinary JavaScript** for everything above the storage boundary;
- **reactive value** for cells, formulas, resources, and domain objects that read
  reactive storage;
- **resource** for setup/sync/finalization abstractions;
- **service** for app-scoped resource-backed state;
- **DOM attachment** or **element resource** for element-backed resource work;
- **adapter** for framework integration packages.

## Terms to avoid or quarantine

Avoid these in first-run docs unless they are explicitly introduced:

- tag protocol;
- runtime protocol;
- tracking frame;
- validation graph;
- dependency graph;
- modifier;
- timeline;
- public/private package-surface taxonomy;
- `@starbeam/interfaces`;
- `@starbeam/tags`.

These terms can appear in advanced or implementor docs.

## Framework posture

Treat React, Preact, Vue, and Svelte as first-class framework targets in the
website's public posture.

The exact 0.9 release polish may differ by adapter, and some polish may happen
after 0.9 if doing it sooner would block the release too long. But the docs
should communicate Starbeam's strong goal: a polished, framework-native
experience in each supported framework, not a single framework with incidental
ports.

When a framework guide is less mature, say that honestly in the guide. Do not
make the top-level website story imply that Vue or Svelte are second-class goals.

## Open questions to flesh out while writing

These questions do not block the positioning memo. They can be refined while
building out website copy:

1. What is the smallest React app-author walkthrough that demonstrates the model
   without becoming a framework-specific deep dive?
2. How much lifecycle should appear in the first page versus the second page?
3. Should the homepage mention Ember directly, or link to an about/history page?
4. What exact wording should describe signals compatibility if compatibility work
   is not complete yet?
5. How should `@starbeam/use-strict-lifecycle` fit into the public docs before it
   has a real README?

## Next writing step

The next docs PER should turn the invariants into public concept prose, starting
with:

> Mark root state. The rest is just JavaScript.

That draft should keep lifecycle close enough to show why Starbeam is more than a
state primitive, but not so close that the first-run model becomes heavy.
