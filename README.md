Starbeam is a library for building reactive data systems that integrate natively
with UI frameworks such as React, Vue, Svelte or Ember.

It interoperates natively with React state management patterns, Svelte stores,
the Vue composition API, and Ember's auto-tracking system.

## Starbeam Reactivity

## Resources

Creating a resource:

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

### Using it in React

Using a resource in React:

```tsx
function UserCard({ username }: { username: string }) {
  const user = useResource(
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

Let's write a simple hook that wraps `RemoteData` into `useRemoteData`:

```tsx
function useRemoteData<T>(url: string) {
  return useResource(() => RemoteData(url), [url]);
}
```

And now we can use it in our app:

```tsx
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

```svelte
<script>
  import { RemoteData } from "./remote-data";
  import { use } from "@starbeam/svelte";

  // username is a prop
  export let username;

  // `use` turns a Starbeam resource into a Svelte store.
  //
  // The `$:` syntax does what we need here. If the value of `username` changes, it will automatically
  // unsubscribe from the store.
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

## Turn Firebase Into a Resource

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

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
  $: document = db.at(path);
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
  @use db: service(firebase);
  @use document = resource(() => service(firebase).at(this.args.path));

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
