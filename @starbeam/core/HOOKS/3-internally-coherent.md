
## Internally Coherent

When we say that Starbeam is **internally coherent** ...

%EXAMPLE: ./examples/quokka/coherence.ts%

```tsx
function Component() {
  const [x, setX] = useState(null);

  setX(new Person());

  return <div>{x.name()}</div>;
  // x is still 0
}

function StarbeamComponent() {
  return useReactiveElement(() => {
    const x = reactive(0);
    x.set(1);

    return () => <div>{x.current}</div>;
  });
}
```

Fetch vs. RemoteData

```ts
function fetch<T>(url: string, cell: Cell<T>): Effect {
  // const state = Cell({ state: "loading" });
  cell.set({ state: "loading" });

  return Effect(async (effect) => {
    try {
      const result = await fetch(url);
      const json = await result.json();

      effect.on.finalize(() => controller.abort());

      cell.set({ state: "loaded", data: json });
    } catch (e) {
      cell.set({ state: "error", reason: e });
    }
  });
}

function RemoteData(url, cell): Resource<JSON> {
  return Resource(async (resource) => {
    const cell = reactive({ state: "loading" });

    try {
      const result = await fetch(url);
      const json = await result.json();

      resource.on.finalize(() => controller.abort());

      cell.set({ state: "loaded", data: json });
    } catch (e) {
      cell.set({ state: "error", reason: e });
    }

    return cell;
  });
}
```

- action (code that runs outside of render)
- task
  - process that is attached to a stateful object, and is aborted when the stateful object is finalized
  - the callback is an action
- resource

  - is a task
  - the callback is an action, and the action is internal
  - exposes a readonly value (`T`) that can **always** be dereferenced (even during rendering)
  - since the resource doesn't expose its mutable reactive state, and the
    callbacks are actions by definition (they run outside of render), this
    pattern guarantees that the mutable reactive state can only be mutated in an
    action.
  - it's a reactive value with lifetime linking

  we need a name for "initialize" (the special action that sets up render, but
  doesn't actually render yet)
