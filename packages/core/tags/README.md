This package contains the implementation of "tags".

All reactive value are tagged values: they represent a JavaScript value and have
a tag that can be used to composably validate the value.

## Tags are not dirty bits

The problem with simply marking a value as dirty when it changes is simple:
multiple consumers.

If you mark a value as dirty, then you need to mark it as clean at some point in
the future. But if the value has multiple consumers, when do you mark it as
clean?

Tags solve this problem by associating a value with a revision: the last time
the value was modified on the global revision timeline.

After retrieving the value of a reactive, the tag will tell you the timestamp
when it was last updated (its "revision"). Later, if you want to check whether
the value may have changed, you can ask the tag for its revision again. If the
revision has advanced, that means that whatever you did with the value needs to
be updated.

## Tags are composable

Defined this way, it becomes easy to compose multiple tags.

If you computed something using multiple reactive values, you ask each of their
tags (the "child tags") for their revision. The revision of the computation is
the maximum of the revision of its child tags.

If you want to know whether the computation is stale, you ask each of its child
tags for its revision again and compute the maximum of the revisions. If the new
maximum is greater than the old maximum, then the computation is stale.

## Fundamental Properties of Tags

Tags have these fundamental properties:

- A `description` property. This is a rich object that enables the logging and
  debugging features of Starbeam. _This property is undefined in production_
- A `dependencies` property. This is a function that, when called, returns a
  list of the cell tags that the current tag depends on. If the value that the
  tag represents is an uninitialized formula, this property is `UNINITIALIZED`.

## The Tags

### Cell Tags

Cell tags represent the most granular changes to reactive values.

When a cell tag represents a _frozen value_, its `dependencies` method returns
an empty list. A frozen value will not change in the future.

When a cell tag represents a _mutable value_, its `dependencies` method returns
a list containing the cell tag itself.

In addition to the fundamental properties, they have the following additional
property:

- A `lastUpdated` property. This property is the revision of the cell tag. It
  is updated whenever the cell tag is updated.

A cell tag's `dependencies()` are:

- empty when the cell tag represents a _frozen value_. A frozen value will not
  change in the future.
- an array containing the cell tag itself when the cell tag represents a
  _mutable value_.

A static value (i.e. a value that will never change during its entire lifetime)
is modelled as a frozen cell (its dependencies will always be empty).

### Formula Tags

A formula tag represents a reactive computation whose component tags can change
when the value is recomputed.

Its `dependencies()` method returns a list of the cells that its current children
depend on. This is a recursive process that returns a flattened list of the cell
tags that the formula tag transitively depends on.

When the formula tag represents an _uninitialized formula_, its `dependencies`
property is `undefined` (and not a function).

> It is possible to render an uninitialized formula. In this situation, the
> renderer will receive a readiness notification. This may make sense under
> certain circumstances (and is used in practice in Starbeam renderers).
>
> However, rendering an uninitialized formula bears some thought about what it
> means to render an uninitialized value.

## Tag Composition

The primary composition in Starbeam is **value composition**. This means that
Starbeam code typically works at the value level:

```ts
const a = Cell(0);
const b = Cell(0);

const c = Formula(() => a.current + b.current);

console.log(c.current); // 0

a.current++;

console.log(c.current); // 1
```

This code doesn't refer to tags at all, and that's true about the primary
programming model of Starbeam: using cells to store reactive values and using
functions to perform computations on reactive values.

In Starbeam, tags are used for two purposes:

1. To enable reactive caching (i.e. `CachedFormula`). A reactive cache is
   invalidated when any of the cells used in its last evaluation (its current dependencies) change.
2. To enable rendering. Rendering is the process of converting a reactive value
   into a representation that's outside of the reactive system and keeping it up
   to date as the reactive value changes.

### Reactive Caches

A reactive cache is implemented as a reactive value. Its `lastUpdated` value is
simply the latest revision of its current dependencies. By implementing a
reactive cache this way, they can be used in other parts of a reactive system
(including in private fields and the internals of other abstractions) without
needing to subscribe along the way.

### Rendering

The Starbeam rendering pattern is:

1. Get the current value of a reactive.
2. Render it.
3. Get the tag for the reactive.
4. When the tag is invalidated, update the rendering.

You can think of rendering as a way to create reactive outputs. For example,
even though Starbeam is not aware of the DOM, you can use a renderer to create a
"reactive DOM node".

Similarly, you can use a renderer to bridge between Starbeam reactivity and an
external reactive system, including frameworks like React and Vue, and reactive
libraries like D3.

Subscriptions in Starbeam power rendering.

A subscription is only semantically valid to keep a concrete value up to date.
This means that subscribing to a formula that hasn't yet been computed is
semantically invalid and will produce an error.

This is only true of subscriptions: computing the _value_ of a formula is always
valid, even when the formula hasn't been computed yet (that's the whole point).

> **TL;DR** getting "the current revision" of a formula that hasn't yet been
> computed doesn't make sense. Intuitively, this is because you can't render an
> unevaluated formula (you can only render a formula's value).
