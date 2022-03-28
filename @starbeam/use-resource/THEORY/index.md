%TOC%

## Unique Component Instances in React

When you render a component in React, it gets a unique "rendered component
instance". If the component function contains any calls to `useState`,
`useRef`, etc. they will be associated with that unique instance.

Consider this example:

```ts
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={setCount((count) => count + 1)}>++</button>
      <p>{count}</p>
    </>
  );
}
```

When React render the Counter component for the first time, the component
calls `useState(0)`. React creates a fresh place to store state **for this
rendered component instance** and stores `0` in it.

The call to `useState(0)` returns the number `0` as well as a function that
you can use to update the counter value.

Whenever React runs the Counter function a second time **for the same
component instance**, the call to `useState` links back up to the same
storage location, and React returns the current value stored in that
location, as well as the setter function.

When you use the setter returned by `useState` to increment the value, React
changes the value in the storage location (in this case to `1`). Since a
storage location **associated with this component instance** changed, React
knows it needs to re-render the `Counter` component, and it schedules an
update.

The next time React renders the component, the call to `useState` will link
back up to the storage location, and voila, the return value will be `[1, setter]`.

## The Catch

This all works great, with a small catch.

As of React 18, React may run a component's cleanup functions (the return
values of `useEffect` and `useLayoutEffect`) and _then_ run its setup
functions (the callbacks in `useEffect` and `useLayoutEffect`) _again_.

> This currently happens when using [Fast Refresh] and is enforced via React
> 18 strict mode. The React team has said that it may run setup functions
> after cleanup for other reasons in the future. For now, support for strict
> mode is a good enough reason to care.

This means that a "component instance" may persist across cleanup.
**Importantly**, this means that your setup code is not allowed to assume
that it runs **after** the top-level of your component function, but
**before** cleanup.

> TODO: Add an example

This is all rather hard to get right.

## The Solution

The `useInstance` hook gives you a way to create a new instance of something
when the component is first instantiated, clean it up when the component is
deactivated, and create a brand **new** instance when the component is
reactivated.

TL;DR It works almost the same way that per-component state in React works,
but gives you a fresh copy whenever React re-attaches the component.

In practice, this means that you can treat React's behavior as a pooling
optimization, rather than as a detail that your component needs to think
about.
