Starbeam is a library for building reactive data systems that integrate natively
with UI frameworks such as React, Vue, Svelte or Ember.

It interoperates natively with React state management patterns, Svelte stores,
the Vue composition API, and Ember's auto-tracking system.

## Starbeam Reactivity

Starbeam's reactivity is based on a very simple, but powerful, idea:

- You mark your mutable state as reactive. Individual pieces of mutable state are called **data cells**.
- You use normal functions (or getters) to compute values based on your mutable state.
- You can turn a function into a **formula cell** to automatically cache it, and it will only recompute when the data cells it uses change.
- You use **resources** to compute values that require structured cleanup.

We call this collection of values the **data universe**. The data universe is always internally coherent. Once you mutate your state, you can call any function that depends on the mutable state, and that function will see an up-to-date version of the state.

Formulas, too, are always up to date. If you change a data cell that a formula depends on, and ask the formula for its current value, the formula will always produce a value that is up to date. You never need to worry about stale data.

The data universe becomes **reactive** when you plug it into your UI framework. Once you plug it into your UI framework, any changes to the data universe will be reflected in your UI automatically.

> 📝 Collectively, data cells and formula cells are called **cells**.

## Data Cells and Formulas

```ts
const state = reactive({
  inches: 0,
});

const increment = () => {
  state.inches++;
};

const inches = formula(() => {
  return new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: "inch",
  }).format(state.inches);
});

expect(inches.current).toBe("0 inches");

increment();
expect(inches.current).toBe("1 inch");

increment();
expect(inches.current).toBe("2 inches");
```

### Making It Universal

```ts
export function InchCounter() {
  const state = reactive({
    inches: 0,
  });

  const increment = () => {
    state.inches++;
  };

  const description = formula(() => {
    return new Intl.NumberFormat(undefined, {
      style: "unit",
      unit: "inch",
    }).format(state.inches);
  });

  return {
    increment,
    description,
  };
}
```

### Plugging it into your UI

#### React

```tsx
import { use } from "@starbeam/react";
import { InchCounter } from "#shared";

export function MeasureInches() {
  const inches = use(InchCounter);

  return (
    <>
      <button onClick={inches.increment}>Increment Inches</button>
      <div>{inches.description}</div>
    </>
  );
}
```

### Svelte

```svelte
<script>
  import { InchCounter } from "#shared";

  $: inches = InchCounter();
</script>

<button on:click={inches.increment}>Increment Inches</button>
<div>{inches.description}</div>
```

### Vue

```vue
<script>
import { InchCounter } from "#shared";

export default {
  setup() {
    const inches = InchCounter();

    return {
      inches,
    };
  },
};
</script>

<template>
  <button v-on:click="inches.increment">Increment Inches</button>
  <div>{{ inches.description }}</div>
</template>
```

## Resources

So what is a resource? A resource is a reactive value, just like our InchCounter above, that requires some cleanup. When you use a resource, you link it to an owner object, and when the owner object is cleaned up, the resource will be cleaned up as well. In practice, most of the time, the owner object is a component in your UI framework.

### The RemoteData Resource

In this example, we'll create a `RemoteData` resource that will fetch data from a remote server.

> Note: We do not call this the `fetch` resource, because a resource represents a **value** not a _task_ with a starting and stopping point. Because of this, the resource is linked, 1:1, to the owner object.

```ts
function RemoteData(url) {
  return Resource((resource) => {
    const result = cell({ type: "loading" });

    const controller = new AbortController();
    resource.on.cleanup(() => controller.abort());

    const response = fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        result.set({ type: "data", data });
      })
      .catch((error) => {
        result.set({ type: "error", error });
      });

    return result;
  });
}
```

Inside of the `RemoteData` function, we use the `Resource` function to create a new resource. The `Resource` constructor takes a function, which we call the "resource constructor". The resource constructor returns a cell that represents its _current value_. When code **uses** the resource, its value will be the current value of the reactive value.

A _resource constructor_ is called once, when the resource is first used. A resource constructor:

- creates internal cells to manage its state
- connects to any stateful external objects it needs to manage, such as a network connection
- describes how to disconnect from those external objects when the resource is cleaned up
- returns a cell that represents the resource's current value

> 💡 A resource can use mutable state internally, and it can interact with the imperative world, but it exposes the messy outside world as a cell that can be used in the data universe like any other cell, including in other formulas and even other resources.

### Using it in React

Now that we've defined our data universe, we want to plug it into React to create a reactive **system**.

```tsx
import { use } from "@starbeam/react";

function UserCard({ username }: { username: string }) {
  // when `username` changes, we clean up the old `RemoteData` resource and create a new one.
  const user = use(
    () => RemoteData(`https://api.github.com/users/${username}`),
    [username]
  );

  if (user.type === "loading") {
    return <div>Loading...</div>;
  } else if (user.type === "error") {
    return <div>Error: {user.error.message}</div>;
  } else {
    return <div>{user.data.name}</div>;
  }
}
```

In principle, we could turn `RemoteData` into a React hook that abstracts the dependencies for once and for all. The `useRemoteData` hook would take a URL, and whenever the URL changes, it would clean up the old resource and create a new one.

```tsx
import { use } from "@starbeam/react";

function useRemoteData<T>(url: string) {
  return use(() => RemoteData(url), [url]);
}
```

And now we can use it in our app:

```tsx
import { useRemoteData } from "#hooks/remote-data";

function UserCard({ username }: { username: string }) {
  const user = useRemoteData(`https://api.github.com/users/${username}`);

  if (user.type === "loading") {
    return <div>Loading...</div>;
  } else if (user.type === "error") {
    return <div>Error: {user.error.message}</div>;
  } else {
    return <div>{user.data.name}</div>;
  }
}
```

### Using it in Svelte

We can plug the same `RemoteData` resource into Svelte by turning it into a Svelte _store_.

```svelte
<script>
  import { RemoteData } from "./remote-data";
  import { use } from "@starbeam/svelte";

  // username is a prop
  export let username;

  // `use` turns a Starbeam resource into a Svelte store.
  //
  // We use the `$:` syntax so that Svelte automatically unsubscribes from the
  // resource when the username changes and creates a new one.
  $: user = use(RemoteData(`https://api.github.com/users/${username}`));
</script>

{#if $user.type === "loading"}
  <div>Loading...</div>
{:else if $user.type === "error"}
  <div>Error: {user.error.message}</div>
{:else}
  <div>{$user.data.name}</div>
{/if}
```

## Turn Firebase Into a Resource

Next, we'll build a slightly more complicated example that uses Firebase. We'll create a resource for the application, which subscribes to Firebase (and unsubscribes when the application is cleaned up). That app resource will vend Firebase _documents_ as resources, which will be automatically updated when the document changes, and cleaned up when their owner is cleaned up.

Basically, we're using Starbeam reactivity and ownership to manage a lot of the complexity that comes up when subscribing to Firebase documents.

```ts
import { initializeApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB-x-q-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X",
  authDomain: "my-app.firebaseapp.com",
  databaseURL: "https://my-app.firebaseio.com",
  projectId: "my-app",
  storageBucket: "my-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789",
};

class Firebase {
  #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  at(path: string) {
    return document(this.#db, path);
  }
}

// `firebase` is defined as a generic resource, which means it has properly described setup and cleanup.
//
// It is intended to be used as a service, which would make it a singleton *in the app*, but that means
// that *apps* can be cleaned up, which is very useful in testing and when rendering on the server in a
// shared context.
//
// In short, instead of using module state as a singleton, use a service.
export const firebase = Resource((resource) => {
  const firebaseConfig = {
    apiKey: "AIzaSyB-x-q-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X",
    authDomain: "my-app.firebaseapp.com",
    databaseURL: "https://my-app.firebaseio.com",
    projectId: "my-app",
    storageBucket: "my-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:123456789",
  };

  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  resource.on.cleanup(() => database.goOffline());
});

export function document(db: Database, path: string) {
  return Resource((resource) => {
    const firebaseDocument = db.ref(path);

    const document = cell({ type: "loading" });

    firebaseDocument.on("value", (snapshot) => {
      document.set({ type: "data", data: snapshot.val() });
    });

    resource.on.cleanup(() => firebaseDocument.off("value"));

    return () => document.current;
  });
}
```

### Using the Firebase Resource in React

```tsx
const Document = component(({ path }, starbeam) => {
  const db = starbeam.service(firebase);
  const document = starbeam.use(() => db.at(path.current));

  return () => {
    if (document.current.type === "loading") {
      return <div>Loading...</div>;
    }

    return <div>{document.current.data.name}</div>;
  };
});
```

### Using the Firebase Resource in Svelte

```svelte
<script lang="typescript">
  import { firebase } from "./firebase";
  import { service } from "@starbeam/svelte";

  export let path: string;

  $: db = service(firebase);
  $: document = use(db.at(path));
</script>

{#if document.type === "loading"}
  <div>Loading...</div>
{:else}
  <div>{document.data.name}</div>
{/if}
```

### Using the Firebase Resource in Ember

```gts
import { service, resource } from "@starbeam/ember";
import { firebase } from "./firebase";

export default class extends Component {
  @service(firebase) db;
  @use document = resource(() => this.db.at(this.args.path));

  <template>
    {{#match this.document}}
      {{:when "loading"}}
        <div>Loading...</div>
      {{:when "data" as |user|}}
        <div>{{user.name}}</div>
    {{/match}}
  </template>
}
```

### Using the Firebase Resource in Vue

```vue
<script>
import { service, resource } from "@starbeam/vue";
import { firebase } from "./firebase";
export default {
  setup() {
    const db = service(firebase);

    return {
      document: resource(() => db.at(this.args.path)),
    };
  },
};
</script>

<template>
  <div v-if="document.type === 'loading'">Loading...</div>
  <div v-else>{{ document.data.name }}</div>
</template>
```

## Starbeam Element Modifiers

https://github.com/maslianok/react-resize-detector

First, we'll build a simple element modifier that will detect when an element is resized.

```ts
interface Size {
  readonly width: number;
  readonly height: number;
}

const ElementSize = Modifier((element, modifier) => {
  const box = element.getBoundingClientRect();
  const size = reactive({ width: box.width, height: box.height });

  const observer = new ResizeObserver((entries) => {
    const last = entries[entries.length - 1];
    size.width = entry.contentRect.width;
    size.height = entry.contentRect.height;
  });

  observer.observe(element);

  modifier.on.cleanup(() => observer.disconnect());

  return size;
});
```

### Using it in React

To see how to use this, let's build a tiny popover library that orients a popover above a target element at its horizontal center.

```tsx
/**
 * The Popover function takes a content string and padding as options (the options can be reactive,
 * and the popover will update when they change).
 *
 * It returns a Modifier whose value is the rendered popover.
 */
function Popover(options: { content: string; padding?: number }) {
  return Modifier((element, modifier) => {
    const size = ElementSize(element);

    return () => (
      <div
        className="popover"
        style={{ left: size.width / 2, top: -options.padding }}
      >
        {options.content}
      </div>
    );
  });
}
```

And using it in our app.

```tsx
function App() {
  return useStarbeam((starbeam) => {
    const options = reactive({ content: "Hello fellow students", padding: 20 });

    // starbeam.render takes a modifier that returns JSX, and returns two values.
    //
    // The first is a ref that you can attach to a DOM element. The second is
    // initially null, but will be set to the result of the modifier when the
    // element is attached.
    const [container, popover] = starbeam.render(Popover(options));

    return () => (
      <div>
        <h1>Hello</h1>
        <article ref={container}>
          {popover}
          Hello world. This is my first blog post. I'm so proud of myself.
        </article>
      </div>
    );
  });
}
```

### Using it in Svelte

The same popover library, but for svelte:

```svelte
// popover.svelte

<script>
  import ElementSize from "./ElementSize";

  export let container;
  export let padding = 20;

  // use turns a Starbeam resource into a Svelte store.
  const size = use(ElementSize(container));
</script>

<div
  class="popover"
  style={{ left: $size.width / 2, top: -padding }}
>
  <slot />
</div>
```

```svelte
<script>
  import ElementSize from "./ElementSize";

  let container;
</script>

<div>
  <h1>Hello</h1>
  <article bind:this={container}>
    {#if container}
      <Popover {container}>Hello fellow students</Popover>
    {/if}
    Hello world. This is my first blog post. I'm so proud of myself.
  </article>
</div>
```

## Using Starbeam to Define React Components

So far we've been using Starbeam to define resources and then using them in
React. But what if we want to define a React component that uses Starbeam
directly?

We're going to take an example that Jack Herrington used in his video "Mastering
React's useEffect" and see how to model the same thing using Starbeam.

https://github.com/jherr/taming-useeffect/blob/main/src/App.js

```tsx
function RemoteData(url, { onSuccess }: { onSuccess: Reactive<() => void> }) {
  return Resource((resource) => {
    const result = cell({ type: "loading" });

    const controller = new AbortController();
    resource.on.cleanup(() => controller.abort());

    const response = fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        onSuccess.current();
        result.set({ type: "data", data });
      })
      .catch((error) => {
        result.set({ type: "error", error });
      });

    return result;
  });
}
```

```tsx
import { useState, useEffect } from "react";
import "./App.css";

import RemoteData from "./RemoteData";

function App() {
  return useResource((resource) => {
    const count = resource.use(Stopwatch);
    const state = reactive({ user: "jack" });
    const user = resource.use(() => RemoteData(`/${state.user}.json`));

    return () => (
      <div className="App">
        <div>Hello</div>
        <div>Count: {count}</div>
        <div>{JSON.stringify(user)}</div>
        <div>
          <button onClick={() => (state.user = "jack")}>Jack</button>
          <button onClick={() => (state.user = "sally")}>Sally</button>
        </div>
      </div>
    );
  });
}

const Stopwatch = Resource((resource) => {
  const counter = reactive({ count: 0 });

  const interval = setInterval(() => {
    counter.count++;
  }, 1000);

  resource.on.cleanup(() => clearInterval(interval));

  return () => counter.count;
});

export default App;
```

## Audience

Who is the audience of this README? Here are some audiences:

- Ember users interested in seeing what's going on here.
- People wanting to build portable libraries that work reactively in multiple UI
  frameworks without having to understand the details of each framework's
  reactivity systems.
- People wanting a more ergonomic and universal reactivity system that works
  well in their existing UI framework.

Key words:

- portable
- hooks
- reactive
- resources
- formulas
