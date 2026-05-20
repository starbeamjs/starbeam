---
title: Experiments
description: "Active Starbeam prototypes and experimental packages that are not the stable app-author path."
---

Experiments are active prototypes. They are useful for exploring directions the
project may take, but they are not the default packages to install for app code.

If you are building an app, start with [Install Starbeam](/start/install/) and
the [Framework guides](/frameworks/overview/). If you are looking for public API
orientation, use [Reference](/reference/overview/).

## How to read experiments

- Treat APIs as provisional.
- Expect README examples to lag behind source and tests.
- Prefer current source and tests over older examples.
- Do not treat experimental packages as compatibility commitments.
- Use [Archive](/archive/overview/) for historical notes and
  [Advanced](/advanced/overview/) for current implementor orientation.

## Current experiments

### `@starbeamx/store`

`@starbeamx/store` explores reactive table, query, grouping, and aggregation
APIs. It is a public experiment, not the default way to model app state.

Useful for exploring:

- table-shaped data;
- reactive queries and filters;
- grouping and aggregation over changing rows.

Current runtime exports include `Table`, `Query`, `Filter`, `Average`, and
`Sum`. Type exports include `Aggregator`, `TableRows`, and `RowTypeFor`.

Source material:

- [packages/x/store/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/x/store/README.md)
- [packages/x/store/index.ts](https://github.com/starbeamjs/starbeam/blob/main/packages/x/store/index.ts)

Caution: the README is example-heavy and may lag current source APIs. Use it for
orientation, not as a stable reference.

### `@starbeamx/vanilla`

`@starbeamx/vanilla` explores a minimal DOM renderer and reference implementation
for Starbeam-backed rendering without a framework adapter.

Useful for exploring:

- how Starbeam can drive text, attributes, elements, and fragments;
- renderer ideas without React, Preact, Vue, or Svelte;
- small implementation examples for people studying render integration.

It is not intended to be a full app framework. App authors should normally use a
framework adapter.

Source material:

- [packages/x/vanilla/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/x/vanilla/README.md)
- [packages/x/vanilla/index.ts](https://github.com/starbeamjs/starbeam/blob/main/packages/x/vanilla/index.ts)

## Not the stable path

Experiments can become future public APIs, stay as examples, or disappear. They
are intentionally separate from the stable app-author path.

For stable docs, use:

- [Start](/start/introduction/)
- [Install Starbeam](/start/install/)
- [Core concepts](/concepts/overview/)
- [Framework guides](/frameworks/overview/)
- [Reference](/reference/overview/)
