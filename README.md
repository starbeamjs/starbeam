## Features To Implement

- [ ] Reactive Outputs
  - [x] TextNode (🔑)
  - [ ] CommentNode (🚀)
  - [ ] ElementNode (🔑)
  - [ ] AttributeNode (🔑)
  - [ ] FragmentNode (🔑)
- [ ] Testing
  - [x] Staticness (🔑)
  - [x] Constness (🔑)
  - [ ] Stability (🔑)
  - [ ] Revalidation efficiency (🥇)
- [ ] Reactive Inputs
  - [x] Cell (🔑)
  - [x] Static (🔑)
  - [ ] Record (🔑)
  - [ ] Choice (🔑)
  - [ ] Function (🔑)
    - [ ] with arbitrary interior access, _required for user-facing functions_ (🔑)
    - [ ] without arbitrary interior access, _required to propagate staticness_ (🔑)
- [ ] Reactive Effects
  - [ ] MVP: A single timing (🔑)
  - [ ] Design for Event Handlers that mutate cells (🔑)
  - [ ] Timing Buckets (🚀)
- [ ] A single top-down revalidation entry-point (🔑)
- [ ] Rehydration
  - [ ] Without Repair (🥈)
  - [ ] Repair (🥈)
  - [ ] Streaming Render (🥇)
- [ ] Adapters
  - [ ] React-like (🚀)
  - [ ] Glimmer-like (🚀)
  - [ ] Redux-like (🥈)
  - [ ] Mobx-like (🥈)
  - [ ] Vue-like (🥇)
  - [ ] Svelte-like (🥇)
- [ ] Guides
  - [ ] Porting the Ember component guide (🚀)
  - [ ] A new tutorial (🚀)
  - [ ] Idiomatic usage (🥈)
  - [ ] Rosetta Stone
    - [ ] For React users (🚀)
    - [ ] For Glimmer users (🚀)
    - [ ] For Vue users (🥈)
    - [ ] For Svelte users (🥈)

> 💡 A component is a function that takes a reactive value and returns a reactive
> output (including a fragment node).

> 💡 Timing bucket considerations: microtask queue, observer timing, paint, task queue

|     |                           |
| --- | ------------------------- |
| 🔑  | Unlocks Parallel Progress |
| 🚀  | Required for Launch       |
| 🥈  | Preferred for Launch      |
| 🥇  | Stretch Goal              |

## Quick Example

```ts
let timeline = new Timeline();

let cell = timeline.reactive("hello");
let text = timeline.dom.text(cell);

let result = timeline.render(text, dom.find("#element"));

result.poll();
```

## Architecture

The goal of Starbeam is to allow you to create a program that takes reactive inputs (a la `createStorage`) and convert them into a reactive DOM.

Goals:

- If all of the inputs to a particular piece of output are "static", no updating work is necessary
- It is possible to determine whether certain pieces of derives state are static based on their inputs

```ts
If(reactive, (dom, string) => dom.text(string));

InlineIf(reactive, (value) => value + 1);

// totally valid user code
let d = derived(reactive, (value) => value.inner + 1);

// because the user code can access interior cells, we can't tell whether `d` is static when the `derived` function
// is called.

let d = restrictedDerive(reactive, (value) => {
  value.inner; // this is somehow an error (or just illegal)
});

// because the function passed to restrictedDerive is only allowed to consume cells from the arguments, we can
// determine whether `d` is static by looking at the arguments
```

```ts
let math = Reactive.function((number: Reactive<number>) => double(addOne(number.current)));

let double = Reactive.function((number: Reactive<number>) => number * 2);

let addOne = Reactive.function((number: Reactive<number>) => number + 1);

let one = Reactive.static(1);
math(one); // this is static

<template>
  {{addOne number}}

  <FaIcon @icon="bug" />
</template>

<template>
  <i class="fa-icon fa {{@icon}}" />
</template>
```

### Inputs

- enum/match

```ts
interface Reactive<T> {
  readonly static: boolean;
  readonly current: T;
}
```

#### Atomic Values

- Reactive Cell (~ `createStorage`)
- Static Cell (related to: const validator in Glimmer)
  - Reactive.static
- Restricted Derived State (you can only consume reactive values as parameters, no derefs of interior cells)
- User-facing derived state (arbitrary derefs)

#### Composed Values

##### Iterable

- When the outer cell changes, you need to re-iterate to get the values
- Otherwise, there is granular interior mutation

- If `[Symbol.iterate]` produces a different list of values (using the key function for equivalence), then `[Symbol.reactiveValue]` must invalidate

##### Record (Product Type, Dictionary, Struct)

```js
class Record {
  /** @type {Record<string, Reactive<...>>}
  #fields;

  get(name) {
    return this.#fields.get(name).current
  }
}
```

##### Choice (Sum Type, Enum, Variants)

```js
const Boolean = Choice.of("true", "false");

let bool = Boolean.variant("true");

// analogous to inline-if
let input = ReactiveMatch(bool, {
  true: () => "YES",
  false: () => "NO",
});

// {{#if bool}}YES{{else}}NO{{/if}}
//

let yes = OutputText(Reactive.static("YES"));
let no = OutputText(Reactive.static("NO"));

let output = OutputMatch(bool, {
  true: yes,
  false: no,
});
```

```hbs
{{#if ec.isLoaded}}
  {{ec.value}}
{{else}}
  {{ec.value}}
  {{! happens to be undefined}}
{{/if}}

<MyThing>
  <:header />
</MyThing>

{{#match ec}}
  {{#when :loaded as |value|}}
    <ul>
      {{#each value as |item|}}
        <li>{{item}}</li>
      {{/each}}
    </ul>
  {{/when}}
{{/match}}
```

### Outputs

- Cursor
  - A cursor is a location in the DOM. Each output node recieves a cursor to "write into" and produces a "range" that begins with the cursor position and ends with some sibling of the cursor position.
  - The node "owns" the entire range that it returned. No parent or sibling/cousin nodes should write into the range.

```ts
interface Output<T> {
  readonly isStatic: boolean;
  render(cursor: Cursor): T;
}
```

```ts
interface Block<In, Out> {
  // assume that value is static, is the result static?
  readonly isStatic: boolean;
  call(value: Reactive<In>): Output<Out>;
}
```

- poll

  - `if output.isDirty() { output.poll() }`

- Leaf nodes (text, comments, attributes)
  - take a single reactive string as an argument
  - owns the output node
  - it is responsible for producing a `TextNode` on every "poll" that is always up to date
  - e.g. `deref(textNode)` always produces a `TextNode`. The first time, it creates the text node. After that, it updates the text node.
  - `static?(text) = static?(input)`
- e.g. Dynamic TagName Element with no attributes
  - takes a `Reactive<string>` as tag name
  - takes an `Output` for the body
  - `static?(elOutput) = static?(tagName) & static?(body)`
  - on first render:
    - derefs `tagName`
    - `createElement(tagName)` ⬅️ append at cursor
    - `let cursor = newElement.appendCursor`
    - `let range = body.render(cursor)`
    - `return element`
  - on poll:
    - if `tagName` changed
      - let cursor = clear the element
      - do on first render again
    - otherwise
      - poll(body)
- match
  - `static?: = static?(variant)`
    - `let [variant /* value */, value /* reactive value */] = deref reactiveVariant`
    - `if !static?(variant) => false`
    - `let template = templates[variant]`
    - `static?(value) & static?(template)`
  - initial render:
    - `let variant = deref reactiveVariant`
    - `templates[variant].render(cursor)`
    - assume: remember the range & node
  - poll:
    - `let [variant, value] = deref reactiveVariant`
    - `if variant changed`
      - `let cursor = clear range`
      - `update range = initial templates[variant].render(cursor)`
    - otherwise
      - node.poll()

```
impl Deref
```

## Rehydration

### Glimmer 3

Starbeam's primary goal is to turn the lessons we learned building Glimmer into a general-purpose reactive view layer for the web.

We also see Starbeam as the next-generation rendering engine for Glimmer (and therefore Ember).

For feature parity with Glimmer, we need:

- [ ] all of the goals in [features to implement]
- [ ] a mapping from Handlebars source code to Starbeam semantics
- [ ] an API compatibility layer

The API compatibility layer should be relatively simple, since almost the entire surface area of Glimmer is exposed via Handlebars syntax.

For Ember compatibility, we will need:

- [ ] support for the stable APIs exposed in [RFC 496] and friends
- [ ] a feature flag in Ember (similar to Glimmer 2's strategy)
- [ ] enough time for the ecosystem to identify and fix bugs

[features to implement]: #features-to-implement
[rfc 496]: https://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html
