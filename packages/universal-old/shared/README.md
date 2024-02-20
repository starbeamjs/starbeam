# `@starbeam/shared`

**Unless you are very interested in the stability strategy of Starbeam, you don't
need to understand how this package works.**

---

This package is designed to make it possible for multiple copies of Starbeam to
interact with each other in a single process.

> For example, this means that:
>
> - if one copy of Starbeam creates a formula
> - and the formula read the value of a cell from another copy of Starbeam
> - then updating the cell will invalidate the formula

## How it Works

It accomplishes this by storing a handful of very stable Starbeam fundamentals
in a single global symbol (`Symbol.for("starbeam.COORDINATION")`).

The first access to any of `@starbeam/shared`'s exports (from any copy of
Starbeam) instantiates the values in that symbol. Future accesses of the exports
use that already instantiated value.

> This package uses `Symbol.for` to ensure that only a single copy of the
> fundamental symbols and constants exists in a single process. As a result, **it
> is not necessary to install this package as a peer dependency**.

## Starbeam Fundamentals

<dl>
  <dt><code>now()</code></dt>
  <dd>Returns the current timestamp as a number.</dd>
  <dt><code>bump()</code></dt>
  <dd>Increment the current timestamp and return the new one.</dd>
  <dt><code>start()</code></dt>
  <dd>Start a new tracking frame. This function returns a function that, when called, finalizes the tracking frame. The finalization function returns a list of the cell tags that were consumed during the duration of the tracking frame.</dd>
  <dt><code>consume(tag)</code></dt>
  <dd>Consume a tag.</dd>
  <dt><code>getId()</code></dt>
  <dd>Returns a unique, deterministic identifier as a string or number. This is useful to create primitive identifiers that are guaranteed to be unique even if multiple copies of Starbeam exist in a single process.</dd>
  <dt><code>TAG</code></dt>
  <dd>The value of the `TAG` symbol. A reactive value's tag is stored in this property.</dd>
  <dt><code>UNINITIALIZED</code></dt>
  <dd>A special value representing an uninitialized value. This is sometimes necessary to differentiate between <code>undefined</code> as an actual user value and an internal uninitialized state.</dd>
</dl>

## Stability

The goal of this package is to provide a place for the most primitive
representation of Starbeam fundamentals. It is designed to be as stable as
possible, so that the implementations of tags and reactive values from multiple
different major versions of Starbeam can interoperate.

We expect this package to remain at `1.x` for the foreseeable future.

If we need to make breaking changes to this package, that will also make
versions of Starbeam that depend on `1.x` incompatible with versions of Starbeam
that depend on `2.x`. As a result, we intend to try as hard as possible to avoid
strictly breaking changes.

One consequence of this design goal is that the functions in this package take
and return simple TypeScript types. For example, timestamps are represented as
numbers and cell tags are just `unknown`.

In practice, interoperability between Starbeam versions will also require
stability in the fundamental protocol of cell tags. This basically means that
the fundamental interface for tags is:

```ts
interface CellTag {
  readonly lastUpdated: number;
  readonly dependencies: () => CellTag[];
}

interface FormulaTag {
  readonly dependencies: undefined | (() => CellTag[]);
}

type Tag = CellTag | FormulaTag;
```

Because TypeScript frequently makes breaking changes, adding these fundamental
types to this package as part of its API is still a work in progress.

However, the description of the fundamental tag types is intended to document
the intended stability of the `Tag` types in Starbeam, which means that the
implementation of tags in other parts of Starbeam will only change if
`@starbeam/shared` has a major version bump.
