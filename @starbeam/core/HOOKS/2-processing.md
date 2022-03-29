## Two Fundamental Phases: Rendering and Action

In Starbeam, data is synchronized with the DOM in the <ins>**Rendering**</ins> phase, and
updated in the <ins>**Action**</ins> phase.

These phases repeat for as long as your app is running.

<Flowchart direction="TD">
  Idle-->Action-->Rendering-->Idle
  Idle(["🔁 Idle"]):::note
  Action["Action<br><i>(update reactive data)</i>"]:::start
  Rendering["Rendering<br><i>(reactive data → DOM)</i>"]:::finish
</Flowchart>

### The Rendering Phase

In the _rendering_ phase, Starbeam reads from reactive cells and synchronizes
their values with the DOM.

During this phase, Starbeam will _read_ from reactive cells, but your code may
not _update_ data cells.

> 📘 Framework-Specific Details
>
> For example, when using Starbeam in a React app (using `@starbeam/react`):
> your components:
>
> - are regular component functions
> - use Starbeam-provided hooks
> - return normal JSX
>
> For an example of @starbeam/react, check out [the @starbeam/react docs][@starbeam/react].

[@starbeam/react]: TODO

### The Action Phase

In the _actions_ phase, you can freely read reactive cells and update reactive
data. As soon as you update reactive data, you can **immediately** check the
value of any formula in your reactive system and its computation will reflect
the change.

Whenever you update your reactive data in response to a browser callback, your
code is in the _Action_ phase. We call code running in the _Action_ phase an
<q>action</q>.

Actions may freely update reactive data and read from formulas in any order.
However, from the perspective actions, the **DOM** is frozen. Actions may read
from the DOM, but the DOM will only reflect changes actions make to data cells
in the next _Rendering_ phase.

Examples of Actions:

- Event Handlers for hardware events, such as click, keypress, input, etc.
- Code running in a `then` callback to a Promise
- Code running after an `await` in an `async function`
- Code running inside of the callback to `setTimeout`, `setInterval`,
  `requestAnimationFrame`, `requestIdleCallback` or `queueMicrotask`.
- ...

> 💡 Deeper Dive
>
> Basically, any code that runs in a browser [task] or [microtask] is running in
> the _Action_ phase. It is impossible for code that the browser scheduled as a
> [task] or [microtask] to run in the _Render_ phase.

[task]: TODO
[microtask]: TODO

%EXAMPLE: ./examples/quokka/simple-coherence.ts%

### How To Think About It

Almost all of the code you write will happen inside of the _Action_ phase.

## Getting Data In: Actions

In real life, we can't just enter all of the data in our reactive system in the console. We need to get data **in**.

In Starbeam,

<Flowchart direction="TD">
Idle --> Action --> Render
<Graph
  name="Idle"
  description="In the idle state, the reactive system is waiting for an action."
  states="[
    { 'name': 'Idle', 'type': 'graphLabel' }
  ]"
/>
<Graph
  name="Action"
  description="An action occurs "
  edges="Action/Render"
  states="[
    { 'name': 'Action', 'type': 'graphLabel' },
    { 'name': 'Render', 'type': 'next' }
  ]"
/>
<Graph
  name="Render"
  description="During the Render phase, the output is updated to match reactive state"
  edges="Render/Event"
  states="[
    { 'name': 'Render', 'type': 'graphLabel' },
    { 'name': 'Event', 'type': 'state' }
  ]"
/>

</Flowchart>
