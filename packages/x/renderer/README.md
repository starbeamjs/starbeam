# Starbeam Renderers

| Framework | Renderer Status | Spec Compatibility |
| --------- | --------------- | ------------------ |
| React     | _released_      | _next release_     |
| Preact    | _released_      | _next release_     |
| Vue       | _next release_  | _next release_     |
| Svelte    | _designing_     | -                  |
| Ember     | _designing_     | -                  |
| Solid     | _roadmap_       | -                  |

"Spec compatibility" means compatibility with the API design in this document.

## Core API

These APIs exist in all renderers.

| API             | Parameter               | Returns                 |
| --------------- | ----------------------- | ----------------------- |
| `setupReactive` | `() => Reactive<T>`     | [`Native<T>`]           |
| `setupResource` | `IntoResourceBlueprint` | [`Native<T>`] React[^1] |
| `getService`    | `IntoResourceBlueprint` | [`Native<T>`]           |

[^1]: React returns `Reactive<T | undefined>` from `setupResource` (see [React Resources](#resources-in-react)).

### Framework-Native Reactive Values (`Native<T>`)

[`Native<T>`]: #framework-native-reactive-values

- In React, these methods return `Reactive<T>`.
- In all other renderers, these methods return a [framework-native reactive
  value](#framework-native-reactive-values).
- Renderers for React-style frameworks also have hook versions of these APIs
  that return a `T`.

### `setupResource`

The `setupResource` function takes a resource blueprint and returns a
[framework-native reactive value].

#### Lifecycle

- The resource is created during the component's [Resource Setup Phase](#special-phases).
- The resource is disposed during the component's [Cleanup Phase](#the-primary-phases).

### `getService`

The `getService` function takes a resource blueprint and gets a service instance
for the current app as a [framework-native reactive value].

If the blueprint has already been instantiated for this app, the same instance
is returned.

#### Lifecycle

- The resource is disposed when the component's application is cleaned up.

## Hook-Style Renderers

A <mark>hook-style component</mark> is a function that runs on both initial
render and update. In this situation, hooks provided by Starbeam set up resource
and services on the initial render. These hooks also return the current value of
the resource on all renders.

React and Preact are hook-style renderers. Solid is not.

### API Summary

Hook-style renderers include the core APIs, which return reactive values.

In addition, they include idiomatic hooks that return bare values.

| Purpose  | Core API                                           | Hook API                                 |
| -------- | -------------------------------------------------- | ---------------------------------------- |
| Reactive | `setupReactive(ReactiveBlueprint<T>) => Native<T>` | `useReactive(ReactiveBlueprint<T>) => T` |
| Resource | `setupResource(ResourceBlueprint<T>) => Native<T>` | `useResource(ResourceBlueprint<T>) => T` |
| Service  | `setupService(ResourceBlueprint<T>) => Native<T>`  | `useService(ResourceBlueprint<T>) => T`  |

In addition, hook-style renderers include a hook that runs during Starbeam's
setup phase: `useInstance`.

```jsx
function Counter() {
  const counter = useResource(Counter);

  const localCount = useInstance(() => Cell(0));
  // localCount returns the cell instance. The count will
  // always be zero after `resource` is initially created
  // (i.e. for each setup phase of Counter)

  return <>
    <p>{counter}</p>
    <button
      onClick={() => localCount.current++}
    >
      Increment
    </button>
  </p>
}
```

All of these hooks take a dependency array that behave idiomatically.

If the dependencies to `useResource` invalidate, the resource will be cleaned up
and reinstantiated. Otherwise, the function passed to the hook will be called
again on the next render.

### Instance-Style Idioms

Applies to renderers that have explicit setup code that runs only once per
component.

- Vue
- Svelte
- Ember
- Solid

#### `useReactive()`

**Note:** Preact does not require the `useReactive` function, because its
plugin API allows us to automatically track values consumed by each component.

The `useReactive` function is called in the setup code of a component. It turns
the component into a reactive component by registering appropriate lifecycle
hooks that allow Starbeam to track all values consumed by the component during
initial render and update.

## Framework-Native Reactive Values

For a JavaScript value of type `T`.

| Framework | Reactive Type | Renderer Status |
| --------- | ------------- | --------------- |
| React     | `T`           | _released_      |
| Preact    | `Signal<T>`   | _released_      |
| Vue       | `Ref<T>`      | _next release_  |
| Svelte    | `Store<T>`    | _designing_     |
| Ember     | `Reactive<T>` | _designing_     |
| Solid     | `Signal<T>`   | _roadmap_       |

## Definitions

### _Component Phases_

You can think of the component phases as a universal lifecycle for components in
all supported frameworks.

This universal lifecycle is _not_ a lowest-common denominator subset. Instead,
it aims to support a universal API that is rich enough to support advanced
features in supported frameworks (such as Vue's `KeepAlive`) while avoiding
gratuitous differences that make it difficult to write universal frontend code.

#### The Primary Phases

These phases are meaningful in all supported frameworks and idiomatic usage of
Starbeam's universal APIs will interact with them.

<!--prettier-ignore-start-->
| Phase | Purpose |
| ----- | ------- |
| Setup | The component's setup code is run once per component. |
| Rendering | This code is run after the setup phase and has access to the state created in the setup phase. |
| Before Paint | This phase is no earlier than the resource setup phase and no later than browser paint. Code that runs in this phase block the browser's painting process. |
| Rendered | This phase is after the _Before Paint_ phase and after the browser paint. If the cleanup phase happens quickly, the _Rendered_ phase may not happen at all. |
| Cleanup | The final phase of a component's lifecycle. During this phase, any registered cleanup handlers are evaluated. |
<!--prettier-ignore-end-->

#### Special Phases

These phases are supported by Starbeam's universal APIs, but are equivalent to
one of the primary phases in most frameworks.

<!--prettier-ignore-start-->
| Phase | Purpose | Framework(s) |
| ----- | ------- | ------------ |
| Resource Setup | This phase is guaranteed to be paired with a future cleanup phase. _This phase happens after rendering in React. In all other frameworks, Setup is guaranteed to be paired with a future cleanup phase._ | React |
| Deactivate | A component is removed from the tree with the possibility of returning in the future. Deactivate must be followed by Reactivate or Cleanup. | Vue |
| Reactivate | A component that was previously deactivated is restored. | Vue |
<!--prettier-ignore-end-->

["task queue"]: https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide#tasks_vs._microtasks

### Component Lifetime and Lifecycle

In Starbeam, a component's lifetime starts with the component's setup phase and
ends when the component's cleanup phase.

Because React has interesting deactivation behavior, make sure to read [React's
Component Lifetime and Lifecycle](#component-lifetime-and-lifecycle-1) appendix
for the full scoop.

### The Cleanup Phase vs. The Deactivate Phase

In most frameworks, there is a single cleanup phase that runs exactly once for
each time a component is instantiated and rendered.

This is not always exactly true:

- React: The cleanup phase may run any number of times during the lifetime of a
  component (zero or more).
- Vue: A special deactivation phase may run any number of times during the
  lifetime of a component. Deactivation is always followed by a cleanup phase
  _or_ a reactivation phase.

**In practice, this means that resources that register cleanup handlers are
cleaned up when the component is cleaned up.**

These handlers may run multiple times during a single React component instance,
which aligns with React's [lifecycle
design](#unmount-and-deactivation-are-equivalent).

## Other Renderer Requirements

### _Current App Instance_

During the evaluation of _setup code_, a stable value that represents the
current application instance.

An application instance has a 1:1 correspondence with the root component of a
render tree.

- It must remain stable across the lifetime of the application
- It must be available to all components in the render tree during their setup
  phase.
- It must expose a way to register cleanup code that should run when the
  application is unmounted.

Frameworks don't typically expose something like this directly, but it's
reasonably easy to synthesize with features like "context" or by requiring the
user to install a framework plugin.

**In practice, this means that most renderers require the user to use a context
provider component or install a plugin in order to use the `service` feature.**

## Summary of APIs for All Official Renderers

| Renderer | Type           |
| -------- | -------------- |
| React    | Hook-Style     |
| Preact   | Hook-Style     |
| Solid    | Instance-Style |
| Vue      | Instance-Style |
| Svelte   | Instance-Style |
| Ember    | Instance-Style |

### Framework Styles

#### Hook-Style

A _hook-style_ API is a function that runs on both initial render and update.

In these frameworks, there is no separation between the code that runs on initial
render and the code that runs on update, but the primitive hooks supplied by the
framework provide tools that you can use to implement behavior that only runs on
initial render.

#### Instance-Style

An _instance-style_ API is an API that has explicit setup code that runs only
once per component. These APIs also have some sort of render function that runs
on each render (both initial render and udpate), and this code has access to the
values created during setup.

Some instance-style frameworks, such as Solid, attempt to use an API style that
mimics hook-style APIs. Others, such as Ember, primarily use JavaScript classes
to distinguish between setup code and rendering. Still others, such as Vue, draw
a strong distinction between setup code and rendering using framework-specific
API patterns.

In addition, instance-style frameworks can support render functions (Solid),
templates (Ember, Svelte), or a mix of both (Vue).

While these distinctions can make these APIs seem very different from each
other, they are fundamental very similar:

> All _instance-style_ frameworks expose an explicit place to run **setup**
> code and a separate way to express **render** logic. The setup code runs
> only once per component, and the state that it sets up is accessible to the
> **render** logic.

### APIs

#### Resources

| Renderer | Setup API                             | Hook API             |
| -------- | ------------------------------------- | -------------------- |
| React    | `setupResource() => Reactive<T>`      | `useResource() => T` |
| Preact   | `setupResource() => Signal<T>`        | `useResource() => T` |
| Solid    | `setupResource() => Signal<T>`        | N/A                  |
| Vue      | `setupResource() => Ref<T>`           | N/A                  |
| Svelte   | `setupResource() => ReadonlyStore<T>` | N/A                  |
| Ember    | `setupResource() => Reactive<T>`      | N/A                  |

#### Services

| Renderer | Setup API                          | Hook API            |
| -------- | ---------------------------------- | ------------------- |
| React    | `getService() => Reactive<T>`      | `useService() => T` |
| Preact   | `getService() => Signal<T>`        | `useService() => T` |
| Solid    | `getService() => Signal<T>`        | N/A                 |
| Vue      | `getService() => Ref<T>`           | N/A                 |
| Svelte   | `getService() => ReadonlyStore<T>` | N/A                 |
| Ember    | `getService() => Reactive<T>`      | N/A                 |

[framework-native reactive value]: #framework-native-reactive-values

## Appendix: React Nitty-Gritty

### The Setup Phase

Since React calls cleanup callbacks multiple times, you might have expected
React to support deactivation and reactivation phases.

However, remember that ["Deactivate must be followed by Reactivate or
Cleanup"](#special-phases). While React runs cleanup callbacks multiple times,
<mark>each run might be the last one.</mark>

> <dl>
>   <dt>Mounting</dt>
>   <dd>When React calls a component's render function for the first time, we say that the component
>   is <mark>"mounting"</mark>.</dd>
>   <dt>Unmounting</dt>
>   <dd>When React calls <code>useEffect</code> and <code>useLayoutEffect</code> cleanup callbacks,
>   even when the dependency array hasn't changed, we say that the component is <mark>"unmounting"</mark>.</dd>
>   <dt>Remounting</dt>
>   <dd>When React calls <code>useEffect</code> and <code>useLayoutEffect</code> again, even when the
> dependency array hasn't changed, we say that the component is <mark>"remounting"</mark>.</dd>
> </dl>

Each time React _unmounts_ a component, its cleanup phase runs. If React
_remounts_ the same component, its setup phase runs again.

From the perspective of Starbeam's lifecycle, a component's lifetime starts when
a component is _mounting_ or _remounting_ and ends when a component is
_unmounting_.

**A single React component can have multiple Starbeam lifetimes.**

Most users will encounter this when using React strict mode. Because Starbeam is
going with the React grain and cleaning up resources when a component is
unmounted, `setupResource` and `useResource` work transparently in React strict mode.

### Resources in React

In other frameworks, the [Setup Phase](#the-primary-phases) is guaranteed to be
paired with a future cleanup phase.

However, React's Setup Phase may run multiple times before a cleanup phase is
run, or a cleanup phase may not run at all.

As a result, Starbeam resources cannot be instantiated until React's special
[Resource Setup Phase](#special-phases).

In practice, this means that resources are `undefined` during the initial render
of a React component. If `undefined` is not desirable, React's `setupResource`
has an `initial` option that you can use to specify what the initial value of
the resource should be during initial render.

> Note that this is a fundamental consequence of React's decision to disallow
> render functions from registering cleanup handlers at the top level.

### Unmount and Deactivation Are Equivalent

In React, there is no meaningful distinction between the cleanup phase and the
deactivate phase. When React calls cleanup callbacks, it is impossible to
determine whether the component is eligible for reactivation in the future.
Components that are never reactivated don't receive any future cleanup
callbacks, so cleanup code has to fully clean up the component.

In contrast, Vue calls `onDeactivated` callbacks when the component is
deactivated, but not `onUnmounted`. If the component is subsequently removed
entirely (and will never be reactivated), Vue calls `onUnmounted` at that point.

As a result, the Vue renderer has a meaningful deactivation phase, while the
React renderer treats deactivation and unmounting as equivalent.

This means that deactivation handlers registered in universal Starbeam code will
run during Vue deactivation, but React deactivation results in full cleanup.

**Unless you have a very specific reason to support a deactivation/unmount
distinction in universal code, you should register cleanup handlers and not
worry about deactivation handlers.**

### Component Lifetime and Lifecycle

In React, each time a component is reactivated, it gets a new component
lifetime. This means that setup handlers run again, and any per-instance state
is reinitialized.

<details>
  <summary>🚧 TODO: Consider Supporting Reactivate in React</summary>

Unlike Vue, this hook cannot be used to persist resources (because we we can't
differentiate between deactivations and final unmounting), but it may be useful
to support persisting in-memory state on an opt-in basis.

</details>

From a usage perspective, this means that resources get cleaned up when a
component is unmounted _or deactivated_ in React.

This is what React's design wants us to do: React intentionally calls cleanup
handlers when a component is deactivated, and intentionally does not give us a
way to run cleanup handlers when a deactivated component is finally disposed.

React Strict Mode intentionally calls cleanup handlers during initial render
(deactivating the component) and then runs effects again (reactivating the
component) to teach users that **cleanup might happen multiple times, and every
cleanup might be the last one.**
