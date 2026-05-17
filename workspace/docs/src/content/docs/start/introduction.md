---
title: Mark root state. Keep the rest JavaScript.
description: "Learn Starbeam's first idea: mark the storage that changes, then keep the rest of your model ordinary JavaScript."
---

Starbeam starts with a small boundary: mark the storage that changes.
Everything above that storage can stay ordinary JavaScript.

Cells, markers, and reactive collections are the root state Starbeam tracks.
Functions, classes, getters, methods, closures, and domain objects can read that
state without becoming special reactive types themselves.

```ts
import { Cell } from "@starbeam/universal";

interface User {
  name: string;
}

class Session {
  #user = Cell<User | null>(null);

  get user() {
    return this.#user.current;
  }

  get isLoggedIn() {
    return this.user !== null;
  }
}
```

The class exposes domain-shaped JavaScript: `session.user` and
`session.isLoggedIn`. The abstraction becomes reactive because it reads reactive
storage internally, not because every layer has to carry a wrapper.

## Derived reads stay ordinary

A derived value can be a function, getter, method, or cached formula. Starbeam
tracks what the read touched when it ran, so users do not have to register a
separate dependency graph.

That means you can start with the shape your app wants:

- `cart.total`, not `cart.total.current`;
- `size.width`, not `size.width.value`;
- `form.isValid`, not `form.validSignal.get()`.

## Resources add lifecycle

Some state needs more than a value. It needs setup, sync, and cleanup.

Resources attach that lifecycle to the same reactive model. Use ordinary reactive
state first; reach for a resource when the thing you are modeling has a lifetime.

## Legible to humans and agents

Starbeam does not ask an AI agent to translate every domain idea into a reactive
DSL before the code can become reactive. The important abstractions stay local,
inspectable JavaScript: modules, classes, methods, getters, collections, and
explicit lifecycle setup, sync, and cleanup.

The developer still owns the design. Starbeam keeps the reactive boundary small
enough that both the human and the agent can reason about the rest of the system
as JavaScript.

## Next steps

- Read [Core concepts](/concepts/overview/) for the map of Starbeam's model.
- Read [Framework guides](/frameworks/overview/) to see how adapters connect this
  model to React, Preact, Vue, and Svelte.
