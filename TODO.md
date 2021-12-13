# Now

- [ ] Separate universe from timeline

# Later

- [x] talk through starbeam repo
- [x] walk through glimmer-validator
- [x] structural improvement
  - [x] what you can work on while I'm on vacation
- [ ] Reactive Primitives
  - [x] Record
  - [x] Choice (1)
  - [ ] List (3)
  - [ ] Function (2)
    - [ ] With interior access (2)
    - [ ] Without interior access (2)
  - [ ] Async (4)
- [ ] Reactive Outputs
  - [ ] DOMTreeBuilder vs. DOMTreeUpdater (1)
  - [x] Element
  - [x] Attribute
  - [ ] Fragment (1)
- [ ] Effects (4)
- [ ] Cross-cutting features
  - [ ] Autotrack (2)
  - [ ] Don't update static things (3)
  - [ ] Don't poll things if they're valid (2)
- [ ] HTML Parser Features
  - [ ] SVG (3)
  - [ ] MathML (4)
- [ ] Structural Improvements
  - [ ] TypeScript eslint
  - [ ] Static + Dynamic in one test (3)
  - [ ] render returns a generator (or maybe async)
  - [ ] Exception safety
    - [ ] what happens if callback throw an exception?
    - [ ] important for: (a) not having white screens, (b) error boundary
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
