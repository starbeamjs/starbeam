This package contains the implementations of the reactive primitives.

Reactive primitives must be used with an implementation of `Runtime`, which
basically means that they must be used together with `@reactive/runtime`.

> The primitives themselves, and higher-level concepts built on the primitives are
> agnostic to the runtime, primarily to clearly mark the runtime interface and
> allow us to revise its implementation over time cleanly.
>
> It is not possible to use multiple runtimes at the same time, and the runtime
> interface is not exposed to the user.

This package provides primitive reactive _values_, building on `@starbeam/tags`,
which provides primitive _tags_ (composable validation).

## The Reactive Protocol

All primitive reactive values implement the reactive protocol:

- `read()`: read the current value of the reactive
- `[TAG]`: get the tag for the reactive value. Tags are stable for the lifetime
  of the reactive value, and therefore may be used to identify the value and cached.

## The Primitives

### Cell

A cell represents storage for a single atomic value.

A cell has an "equivalence" property: when the cell is updated with a value that is
equivalent to the previous value, the new value is ignored. The default
equivalent property is `Object.is`, but it can be overridden with the `equals`
option to the `Cell()` constructor .

In addition to `read()`, a cell also has these fundamental operations:

- `update(T => T)`: update the value of the cell. This method takes a callback
  that receives the previous value and returns a new value. This method does not
  consume the cell.
- `freeze()`: freeze the value of the cell. The cell can no longer be updated,
  so any subscribers to the cell are automatically unsubscribed.

`Cell` also has a few conveniences:

- The `current` property, which is mutable. This makes it possible to write
  things like `cell.current++`.
- the `set` method, which just takes a new value and updates the cell.

### Marker

A marker is a simple primitive that has no value, but instead represents values
stored elsewhere. For example, reactive collections store their values in the
JavaScript collections they represent, and use markers to represent each
discrete piece of storage in the collection.

A marker has these fundamental operations:

- `mark()`: mark the external storage as being dirty.
- `read()`: add the external storage to the current tracking frame.
- `freeze()`: indicate the the external storage will never change in the future.

> Reactive collections use markers more interestingly than just to represent
> external values. For example, reactive `Map` has a marker for both `has` and
> `get` for each entry in the map. This means that if a formula used a `has`
> check to check for a key's presence and it returns `true`, updating the value
> of that key will not invalidate the formula.
