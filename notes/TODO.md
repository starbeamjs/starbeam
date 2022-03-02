# Now

- [ ] Establish the debugging protocol
  - [ ] Make sure that Composite successfully collapses its constituent parts
- [ ] Make aliases for reactive internals for higher-level abstractions (using either Composite or a single-reactive version of Composite)

# Done

- [ ] Make timeline a singleton
- [ ] Make other parts of universe a singleton?
- [ ] implement on.advance
- [ ] do another demo
- [ ] get it working in a React app

# Later

- [x] talk through starbeam repo
- [x] walk through glimmer-validator
- [x] structural improvement
  - [x] what you can work on while I'm on vacation
- [ ] Reactive Primitives
  - [x] Record
  - [x] Choice (1)
  - [ ] List (3)
  - [x] Function (2)
    - [x] Without parameters, with interior access (2)
    - [ ] With parameters, without interior access (2)
  - [ ] Component
    - [ ] Normal: with interior access (2)
    - [ ] Restricted: only dereference the parameter (2)
  - [ ] Async (4)
- [ ] Reactive Outputs
  - [ ] DOMTreeBuilder vs. DOMTreeUpdater (1)
  - [x] Element
  - [x] Attribute
  - [ ] Fragment (1)
- [ ] Effects
  - [ ] destroyable (4)
  - [ ] effects (5)
  - [ ] effect timing (6)
- [ ] Cross-cutting features
  - [x] Autotrack (2)
  - [ ] Don't update static things (3)
  - [ ] Don't poll things if they're valid (2)
  - [ ] Splattributes (4)
  - [ ] ARIA (5)
- [ ] HTML Parser Features (in progress)
  - [ ] SVG (3)
  - [ ] MathML (4)
- [ ] Structural Improvements
  - [ ] TypeScript eslint
  - [ ] Static + Dynamic in one test (3)
  - [ ] render returns a generator (or maybe async)
  - [ ] Exception safety
    - [ ] what happens if callback throw an exception?
    - [ ] important for: (a) not having white screens, (b) error boundary
  - [ ] const (reactive values that can no longer change)
- [ ] Investigate
  - [ ] Does setAttribute (without NS) on a non-HTML element produce the correct namespace (1)

# Ecosytem

- [ ] Validate that namespaces are supported in basically all JSX implementations
- [ ] Try to add `@attr` to JSX

# Timeline

- January 1, 2022
- February 15, 2022 ⬅️ 3-month MVP
  - it can be used by Chirag for at least one thing in production
- June 1, 2022
  - it can be advertised as a general-purpose thing

# Notes

- [ ] Chaos Monkey mode (run without validation, which means that all reactive
      values are polled, even if they would otherwise validate)
