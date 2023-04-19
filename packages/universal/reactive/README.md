This package contains the implementations of the reactive primitives.

Reactive primitives must be used with an implementation of `Runtime`, which
basically means that they must be used together with `@starbeam/runtime`.

Higher-level packages, such as `@starbeam/universal`, `@starbeam/resource` and
the renderers include `@starbeam/runtime` as a dependency.

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

> You can think of a marker as a kind of cell without a value.

A marker has these fundamental operations:

- `mark()`: mark the external storage as being dirty.
- `read()`: add the external storage to the current tracking frame.
- `freeze()`: indicate the the external storage will never change in the future.

> Reactive collections use markers more interestingly than just to represent
> external values. For example, reactive `Map` has a marker for both `has` and
> `get` for each entry in the map. This means that if a formula used a `has`
> check to check for a key's presence and it returns `true`, updating the value
> of that key will not invalidate the formula.

### Formula

A formula is a function that computes a reactive value. A formula's dependencies
is the set of cells that were accessed during its last computation.

A formula is a [reactive value](#the-reactive-protocol). Whenever the formula
is `read()`, it recomputes its value. It is also a function. Calling the formula
has the same behavior as calling the formula's `read()` method.

#### Cached Formula

A cached formula behaves like a formula, but it only recomputes its value when
one of its dependencies changes.

## Formula vs. CachedFormula

Both formulas and cached formulas are reactive values. You can render either one
(see `@starbeam/runtime` for more information). In either case, when the formula
is recomputed, its dependencies are updated, and the formula's renderers will
receive readiness notifications when any of the new dependencies change.

The difference is that a cached formula will only recompute when one of its
dependencies changes.

Normal formulas are suitable for **mixed-reactive environments**, where a
Starbeam formula uses both Starbeam reactive values **and** a framework's native
reactive values.

For example, consider this situation when using the React renderer:

```ts
function Counter() {
  const [reactCount, setReactCount] = useState(0);

  const starbeamCount = useSetup(() => {
    const count = Cell(0);

    return {
      increment: () => {
        count.current++;
      },
      get count() {
        return count.read();
      },
    };
  });

  return useReactive(() => {
    <p>
      React count: {reactCount}
      <button onClick={() => setReactCount(reactCount + 1)}>Increment</button>
    </p>;
    <p>
      Starbeam count: {starbeamCount.count}
      <button onClick={starbeamCount.increment}>Increment</button>
    </p>;
  });
}
```

Under the hood, `useReactive` uses a normal formula, which will result in an
updated output whenever either `reactCount` or `starbeamCount.count` changes.

- If `reactCount` changes, React will re-render the component, and the formula
  will be recomputed.
- If `starbeamCount.count` changes, the formula will be recomputed, and React
  will re-render the component.

In practice, this makes `Formula` a good default choice for mixed-reactive
environments. You can always use `CachedFormula` if you are confident that your
formula doesn't use any reactive values external to Starbeam to optimize your
code further.
