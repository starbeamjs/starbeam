# Purpose

**This document is outdated, but still contains relevant philosophical information.**

`@starbeam/runtime` is part of Starbeam, a library for building and using reactive objects in any framework.

## Primitive

`@starbeam/runtime` is stable, with the same [semver policy as Starbeam][starbeam semver policy].

That said, it is not intended to be used directly by application code. Rather, it is one of the core parts of the Starbeam composition story. You can use it to better understand how Starbeam works, or to build your own Starbeam libraries.

> 📙 Philosophy
>
> Higher-level libraries like `@starbeam/universal` build on lower-level primitives. These are not privileged internal APIs, and they are not marked as unstable. We believe that you, the people building Starbeam's library ecosystem, are just as innovative as Starbeam's creators. We avoid including "for me but not for thee" APIs in our composition abstractions. Go forth and build!

## Timeline and Lifetime

At a fundamental level, Starbeam reactivity is made up of **mutation events** that happen to a **data universe** at a point **on a timeline**.

The _data universe_ is broken up into two kinds of cells: **data cells** and **formulas**.

<dl>
  <dt>Data Cells</dt>
  <dd>A single, atomic piece of <i>mutable</i> data.</dd>
  <dt>Formulas</dt>
  <dd>Computations that <i>derive</i> data from other data cells or formulas.</dd>
</dl>

## Two Phases: Action and Render

The Starbeam reactivity system is a perpetual cycle between two phases: Action and Render. These phases run in a cycle for as long as the program is running.

<dl>
  <dt>The Action Phase</dt>
  <dd>Application code freely mutates the <i>data universe</i>.</dd>
  <dt>The Render Phase</dt>
  <dd>The <i>data universe</i> is reflected onto the rendered output.</dd>
</dl>

### The Action Phase

Code in the _Action_ phase is quite powerful. It can mutate data cells as much as it wants, and it can immediately get the up-to-date values of formulas. Code in the _Action_ phase can also **read** from the rendered output.

In exchange for all of that power, code in the _Action_ phase **cannot** directly write to the rendered output, and it will need to wait until the _next_ _Action_ phase to see how the mutations to the _data universe_ reflected onto the rendered output.

### The Render Phase

Code in the _Render_ phase is considerably **less** powerful. It may _read_ from the _data universe_ and _write_ to the _rendered output_, but it **may not** write to the _data universe_.

## ℹ️ The Complete Rendering Process

When using Starbeam to reflect the _data universe_ into a Browser DOM, rendering involves multiple iterations of the _Action_ / _Render_ cycle. We call the entirety of this process the _Rendering Process_.

<dl>
  <dt>The Rendering Process</dt>
  <dd>The cycles of <i>Action</i> / <i>Render</i>
</dl>

These steps allow you to implement _framework-agnostic_ [resources] that can correctly use the DOM as data source. They are [universal], which means that you can write code in terms of Starbeam's APIs, and it will run inside of the framework of your choice with a [Starbeam adapter].

<dl>
  <dt>Step 1: Initial Render</dt>
  <dd>Set up your <i>data universe</i> and compute your framework's representation of HTML for the first time.</dd>
  <dt><b>First Render Phase</b>: DOM Insertion</dt>
  <dd>Your framework is inserting your HTML into the DOM. From now until it has painted, which occurs <u>after</u> Step 2, the browser will not accept hardware events from the user.</dd>
  <dt>Step 2: Measurement</dt>
  <dd>The HTML you produced is now in the DOM, but the browser has not yet painted it. You can safely read measurements and styles from the DOM and write that information into the <i>data universe</i>. <u>This phase allows you to participate in the layout and styling process in a relatively efficient manner.</u></dd>
  <dt><b>Second Render Phase</b>: User-aided layout</dt>
  <dt>Step 3: Ready</dt>
  <dd>The browser has painted your component, which includes the changes you made to the <i>data universe</i> in the <i>measurement</i> step. The browser is now idle, and is accepting user events again. Now  is a great time to perform steps that aren't critical to the layout or styling of your component, such as kicking off asynchronous queries.</dd>
</dl>

> 📒 Note
>
> Each of these three steps is an _Action_ / _Render_ cycle. During the _Action_ phase, application code can mutate the _data universe_ and read from the DOM. During the _Render_ phase, your framework will update the DOM from the changes you made during the _Action_ phase. Typically, the three cycles of the rendering phase happen in quick succession, but you should not rely on this. Your framework may choose to do other work between the phases, and modern frameworks commonly do so in order to provide an optimal experience for your users.
>
> Also, while application code will typically have an opportunity to run inside of each step of the _Rendering Process_, your framework may choose to [deactivate] or [unmount] the component before the <i>Ready</i> step. If application code sets up some state that needs to be torn down, it should not rely on the <i>Measurement</i> or <i>Ready</i> steps running. Instead, finalizers registered with an appropriate _lifetime_ ([see below][lifetime]) are guaranteed to run even if the <i>Measurement</i> or <i>Ready</i> steps do not.

**In practice, these considerations are bundled together into the high-level "Stateful Formula" construct provided by [@starbeam/reactive].**

## Timeline

The `Timeline` in `@starbeam/runtime` coordinates these phases.

It starts out in the _Actions_ phase, which allows free access to the _data universe_. As soon as a _data cell_ in the _data universe_ is mutated, the `Timeline` schedules a _Render_ phase using the configured scheduler. By default, this will schedule a _Render_ phase during a microtask checkpoint, which occurs asynchronously, but before the next paint.

### Scheduling

The `Timeline` can be configured with a `Coordinator` (see [@starbeam/schedule]), which controls the exact details of the timeline's timing.

The default behavior automatically schedules the next _Render_ phase using a microtask checkpoint, which means that it will happen asynchronously, but before the next time the browser paints the page. The purpose of the `Coordinator` is to allow you to make multiple mutations to the _data universe_ before a _Render_ phase occurs.

You can specify a custom `Coordinator` to use an alternative strategy. For example, if you are writing a single-file demo, the entire file will finish running before a microtask checkpoint. You could create an API to use a single-file demo that automatically schedules _Render_ phases at appropriate times.

Finally, you can also explicitly schedule a _Render_ phase, which will supersede the `Coordinator`'s policy and simply wait until you're ready to render.

```ts
import { TIMELINE } from "@starbeam/runtime";
import { Cell } from "@starbeam/reactive";

const person = reactive({
  id: null,
  name: "@tomdale",
});
const name = Cell("Tom");
const userId = Cell(null);

function multiStepProcess(name, url) {
  const render = TIMELINE.manualRenderPhase();

  person.name = name;

  fetch(url).then((data) => {
    person.id = data.id;
    render();
  });
}
```

## Moving Along the Timeline

The `Timeline` is a representation of [discrete time](https://en.wikipedia.org/wiki/Discrete_time_and_continuous_time#Discrete_time), where each mutation to a _data cell_ is given a unique, [monotonically](https://en.wikipedia.org/wiki/Monotonic_function) increasing timestamp.

<details>
  <summary>😵‍💫 <i>Here's what that means:</i></summary>

> Every time you mutate a _data cell_, the `Timeline` assigns increments the "current timestamp" by `1`, and assigns that timestamp to the mutation.
>
> "Discrete time" just means that there are specific points in time that we are interested in, and that "nothing interesting" happens in between those points.

</details>

When you are in an _Action_ phase, this happens automatically.

On the other hand, _Render_ phases are frozen in time. They **may not** move the timeline forward. In practice, this means that [formulas] are read-only and may not mutate the _data universe_.

> 💡 Note
>
> This has nothing to do with the **location** of callbacks in the code. For example, it is quite normal for event handlers to occur inside initialization (the code that computes the initial state of the DOM from the _data universe_). However, the event handlers **do not run** during initialization, but rather at a later time, in response to hardware events triggered by the user.
>
> By definition, such events happen in the _Action_ phase, even though the function that they call was created during initialization.

## Formula Validation

> TODO: Describe the validation process

### Subscription

> TODO: Describe how to subscribe to changes in a formula

## Structured Finalizer

As we discussed, the _timeline_ describes changes in the _data universe_ and helps a consumer coordinate the two-phase process of reflecting the _data universe_ onto the output. Both _data cells_ and _formulas_ are pure data: they can be automatically cleaned up by the garbage collector when nobody retains a reference to them.

On the other hand, you may encounter objects in the real world that require you to tear them down when you're done using them, and you may want to convert those objects into data in the _data universe_. That's where the **structured finalizer** comes in.

The _structured finalizer_ allows you to set up a stateful connection to some external data, such as a WebSocket, ResizeObserver or even a `fetch` request, associate it with an **owner**, and automatically finalize the connection when the _owner_ is finalized.

For example, a component may set up a [ResizeObserver] to keep track of the size of one of the elements it creates. When the component is deactivated, the component wants to finalize the `ResizeObserver` so that it doesn't leak.

### Composition is King

Starbeam uses the _structured finalizer_ approach to make finalization composable. Instead of making the component responsible for setting up the `ResizeObserver` and specifying how to finalize the `ResizeObserver` when the component it finalized, it can delegate responsibility to an `ElementSize` resource:

1. Create an object that represents the `ResizeObserver`.
2. Convert events on the `ResizeObserver` into data in the _data universe_.
3. Specify what should happen when that object is finalized.
4. _Link_ that object to the component.

### Example: The Resource Pattern

Let's see how this all fits together. We'll use the resource pattern from `@starbeam/reactive` to create an `ElementSize` resource.

```ts
import { Resource } from "@starbeam/reactive";

export function ElementSize(element: Element) {
  return Resource((resource) => {
    const size = reactive(getSize(element));

    const observer = new ResizeObserver();

    observer.observe(element, () => {
      const { width, height } = getSize(element);

      size.width = width;
      size.height = height;
    });

    resource.on.finalize(() => observer.disconnect());

    return size;
  });
}

function getSize(element: Element) {
  const rect = element.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
  };
}
```

Let's look at it one piece at a time.

First, we create a vanilla `getSize` function to get the width and heigh from an element.

```ts
function getSize(element: Element) {
  const rect = element.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
  };
}
```

Next, we create a function that will take an element and set up the resource.

```ts
export function ElementSize(element: Element) {
  return Resource((resource) => {
    // ...
  });
}
```

This function operates on a fixed element, such as the top-level element of a component. The function calls the `Resource` function, the built-in constructor for the _resource_ pattern. Let's see how it works.

First, we create a reactive object with the element's width and height.

```ts
const size = reactive(getSize(element));
```

Next, we create a `ResizeObserver` and observe the element.

```ts
const observer = new ResizeObserver();

observer.observe(element, () => {
  const { width, height } = getSize(element);

  size.width = width;
  size.height = height;
});
```

When the `ResizeObserver` fires, we update the `width` and `height` properties of the reactive object. **Importantly**, the `ResizeObserver`'s callback runs in the _Action_ phase, like all asynchronous callbacks invoked by the browser. This means that we can freely mutate anything in the _data universe_. Any part of the rendered output that cares about the reactive object will run in the next _Render_ phase, which Starbeam will automatically schedule.

Ok, that's great, `ResizeObserver` requires us to disconnect from it when we no longer need it. If we don't disconnect, the observer will leak. No problem! That's the whole point of the `Resource` API. Let's tell Starbeam what to do when the resource is finalized.

```ts
resource.on.finalize(() => observer.disconnect());
```

> This code is not responsible for attaching the `ElementSize` resource to any particular owner. That will happen inside the framework adapters, which know how to turn your framework's concept of component into a Starbeam owner.

```ts
return size;
```

Finally, we return the `size` object. The `Resource` function returns an object with an `owner()` method on it, which the caller can use to link the resource to an owner. The `owner()` method returns the object with reactive _width_ and _height_ properties.

<details>
  <summary>📒 <i>The <code>Resource</code> Interface</i></summary>

```ts
interface Resource<T> {
  owner(parent: object): T;
}
```

</details>

Once linked, `ElementSize` is a regular formula that can be used as part of other formulas.

### 📒 _Framework-Specific Details_

Starbeam's framework adapters provide a way to attach a function that takes an Element (called an "element modifier") to an element when the framework has created it using framework-specific APIs.

For example, you would use the `ref` API to attach a modifier in React, while you would use the `use:` directive syntax to attach a modifier in Svelte. Check out the framework-specific documentation for more details.

<details>
  <summary>⚛️ <i>A React Example</i></summary>

If all of this is getting too abstract, let's take a look at how you would actually use `ElementSize` in React.

```ts
function Box({ children }) {
  return useReactiveElement((element) => {
    const div = ref(HTMLDivElement);
    const size = element.useModifier(div, ElementSize);

    return () => (
      <>
        {size.match({
          rendering: () => null,
          attached: (size) => `${size.width}x${size.height}`,
        })}
        <div ref={div}>{children}</div>
      </>
    );
  });
}
```

`@starbeam/react` provides a React-specific way to create a `ref` to put into your JSX, and then use the `ElementSize` modifier with that `ref`. `@starbeam/react` takes care of interacting with React to get the element, and invokes the `ElementSize` modifier once the element is in the DOM.

Since the React `ref` API requires you to complete a full render cycle in order to attach the ref, the `useModifier` API in `@starbeam/react` returns a value that can either be `rendering`, because it's the first render, or `attached`, once the element is in the DOM. You can use the `match` API to decide what to do on the first render.

Critically, while the `useReactiveElement`, `ref` and `useModifier` APIs come from `@starbeam/react`, they interact with the _universal_ `ElementSize` modifier that we wrote without having to know anything about React at all.

</details>

### Terms

<dl>
  <dt>Finalize</dt>
  <dd>When an object is <i>finalized</i>, it means that it is no longer in use, and it's safe to clean up internal references to data structures that require cleanup. Starbeam finalization refers to many concepts you may have seen in other contexts: destruction, teardown, cleanup, unmounting and deactivation.</dd>
  <dt>Owner</dt>
  <dd>When a finalizable object has an <i>owner</i>, it will be finalized when its owner is finalized.</dd>
  <dt>Link</dt>
  <dd>The process of assigning a finalizable object to an owner is called <i>linking</i>.</dd>
  <dt>Resource</dt>
  <dd>A pattern for creating a <i>formula</i> that application code can easily link to an owner</dd>  
</dl>

## The Concept of "Lifecycle"

> TODO: Describe the difference between a general concept of "lifecycle hooks", as presented by other frameworks, and how we think about the interaction between phasing and finalization in Starbeam.

[lifetime]: #lifetime
[@starbeam/schedule]: https://github.com/wycats/starbeam/tree/main/%40starbeam/schedule
[@starbeam/reactive]: https://github.com/wycats/starbeam/tree/main/%40starbeam/reactive
[formulas]: https://github.com/wycats/starbeam/tree/main/%40starbeam/reactive#TODO-formula
[stateful formulas]: https://github.com/wycats/starbeam/tree/main/%40starbeam/reactive#TODO-stateful-formula
[universal]: https://github.com/wycats/starbeam#TODO-universal
[starbeam adapter]: https://github.com/wycats/starbeam#TODO-adapter
[starbeam semver policy]: https://github.com/wycats/starbeam#TODO-semver
[resizeobserver]: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
