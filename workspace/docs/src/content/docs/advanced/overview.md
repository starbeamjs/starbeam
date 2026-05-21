---
title: Advanced and implementor docs
description: "Orientation for adapter authors, Starbeam maintainers, and readers debugging Starbeam internals."
---

This section is for people working on Starbeam itself: adapter authors,
runtime/protocol implementors, and maintainers reviewing release-surface
changes. It is an orientation page, not a complete protocol guide.

## If you are not implementing Starbeam

Most readers should start elsewhere:

- App authors: [Start](/start/introduction/) and [Install Starbeam](/start/install/).
- Library authors: [Library-author guide](/library-authors/overview/).
- Package lookup: [Reference](/reference/overview/).
- Framework usage: [Framework guides](/frameworks/overview/).

Advanced docs may use internal terms such as runtime, tags, renderer, tracking
frame, and protocol. Those terms are useful for implementors, but they are not
part of the app-author first-run path.

## How to read the source notes

Starbeam's advanced source material is a mix of current docs, decision records,
working triage notes, and historical notes. Treat each source by status:

- **Current implementor docs** describe a package or semantic contract that is
  active today.
- **Decision records** explain why a boundary exists. They are useful for design
  context, not always polished public copy.
- **Working triage notes** capture current classification and release-surface
  policy. They may change as packages settle.
- **Historical notes** are background only. Do not treat them as current API
  guidance.

When in doubt, prefer current package exports and tests over older notes.

## Concept map

### Semantics and invariants

The invariants describe Starbeam's semantic contract: what counts as root state,
how cached work is validated, how resources synchronize and finalize, and where
framework adapters own rendering or lifecycle boundaries.

Use the invariants when a change might affect behavior across packages or
framework adapters.

Source material:

- [docs/INVARIANTS.md](https://github.com/starbeamjs/starbeam/blob/main/docs/INVARIANTS.md)

### Renderer adapter kit

`@starbeam/renderer` is the shared kit for framework adapters. It provides common
setup helpers for reactive reads, resources, services, and element resources.
Adapters still own framework-specific scheduling and publication.

Use renderer material when implementing or reviewing adapter behavior.

Source material:

- [packages/universal/renderer/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/renderer/README.md)

### Runtime, tags, interfaces, and shared

These packages are the low-level substrate under Starbeam's public APIs:

- `@starbeam/runtime`: runtime coordination for finalization scopes,
  subscriptions, and reactive scheduling.
- `@starbeam/tags`: low-level validation substrate for primitive and renderer
  implementors.
- `@starbeam/interfaces`: type-only protocol substrate.
- `@starbeam/shared`: shared coordination for cross-package and cross-copy
  behavior.

These packages are not part of the app-author path. Use them when maintaining
Starbeam internals or adapter integrations.

Source material:

- [packages/universal/tags/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/tags/README.md)
- [packages/universal/interfaces/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/interfaces/README.md)
- [packages/universal/shared/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/shared/README.md)

Historical source:

- [packages/universal/runtime/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/runtime/README.md)

The runtime README contains useful background, but it is historical in places.
Do not use it as the source of truth for current API examples.

### DOM attachment and element resources

DOM attachment is the public concept for resource work tied to framework-supplied
DOM elements. Framework adapters expose their own authoring APIs, while shared
renderer code owns common setup and finalization vocabulary.

Source material:

- [docs/DOM-ATTACHMENT-BOUNDARY.md](https://github.com/starbeamjs/starbeam/blob/main/docs/DOM-ATTACHMENT-BOUNDARY.md)
- [docs/DOM-ATTACHMENT-ERGONOMICS.md](https://github.com/starbeamjs/starbeam/blob/main/docs/DOM-ATTACHMENT-ERGONOMICS.md)

### React lifecycle and compiler notes

React integration has extra constraints around Strict Mode, render/effect timing,
and React Compiler compatibility. Use these notes when changing React adapter
lifecycle behavior or reviewing compiler-facing code.

Source material:

- [packages/react/use-strict-lifecycle/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/react/use-strict-lifecycle/README.md)
- [packages/react/use-strict-lifecycle/THEORY.md](https://github.com/starbeamjs/starbeam/blob/main/packages/react/use-strict-lifecycle/THEORY.md)
- [docs/INVARIANTS.md](https://github.com/starbeamjs/starbeam/blob/main/docs/INVARIANTS.md)

Use the `@starbeam/use-strict-lifecycle` README for the public infrastructure
surface. Treat the theory note as implementation background.

### Package-surface policy

Package-surface notes explain which packages are public, private, compatibility
aliases, experiments, or implementor surfaces. Use them when a change affects
published artifacts, declarations, source maps, or package boundaries.

Source material:

- [docs/PACKAGE-SURFACE.md](https://github.com/starbeamjs/starbeam/blob/main/docs/PACKAGE-SURFACE.md)
- [docs/PACKAGE-SURFACE-TRIAGE.md](https://github.com/starbeamjs/starbeam/blob/main/docs/PACKAGE-SURFACE-TRIAGE.md)

These are decision records and triage notes, not tutorial prose.

## What this page does not cover yet

This overview does not yet replace the source notes above. It also does not yet
provide generated API reference, adapter-author walkthroughs, or a full protocol
guide. Those can become subpages after the current user-facing docs are stable.

## Next steps

- [Library-author guide](/library-authors/overview/): reusable abstractions that
  do not need adapter internals.
- [Reference](/reference/overview/): public package surface at a glance.
- [Framework guides](/frameworks/overview/): app-facing adapter APIs.
