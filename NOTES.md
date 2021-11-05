- readme driven development
- vite
- typescript
- test harness
- timeline / revision
- Reactive / ReactiveStatic
- text node
  - Core Philosophy: each node returns a cache that represents the output, and
    is responsible for managing updates to its section of the output on demand
  - "on demand" means containment-based polling - If a node only handles static
    data, it _still_ returns a cache, but the caller doesn't need to poll it when
    it's polled
  - it's possible to determine the staticness of a child before actually executing
    it, and in general the "built node" can have useful propagated metadata that is
    separate from execution (this is basically the semantic difference between Glimmer
    and React, and the point of the project)
- static/const propagation (bake into the tests)
- ReactiveFunction
  - needed rather than just a cache to propagate static info
  - let's go with a single object of arguments for type purposes
- add a test for text node that uses ReactiveFunction
- next steps: structured control flow
  - Record / Choice
  - Containment-based DOM ownership
