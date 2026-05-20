---
title: Archive
description: "Historical Starbeam notes that are useful for design archaeology but are not current API docs."
---

Archive is a quarantine map for historical and superseded Starbeam notes. These
links are useful when you want design background, but they are not current API
documentation.

## How to read archived notes

- Treat examples as historical unless a current docs page or package README says
  otherwise.
- Prefer current package exports, tests, and the public docs when sources
  disagree.
- Use [Advanced and implementor docs](/advanced/overview/) for current
  implementor orientation.
- Use [Reference](/reference/overview/) for the public package surface.
- Use [Start](/start/introduction/) and [Install Starbeam](/start/install/) for
  app-author guidance.

## Archive map

### Historical universal concepts

[packages/universal/universal/CONCEPTS.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/universal/CONCEPTS.md)
records older thinking about universal concepts, resources, and services.

Still useful for:

- understanding how earlier Starbeam concepts were organized;
- reading design history around resources and services.

Stale or risky for current docs:

- service imports and package boundaries have changed;
- current app and library docs should use `@starbeam/universal`,
  `@starbeam/collections`, and framework adapter APIs as documented today.

### Historical runtime notes

[packages/universal/runtime/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/runtime/README.md)
contains older runtime and scheduling notes.

Still useful for:

- design archaeology around runtime coordination;
- background on how earlier Starbeam versions described reactive rendering.

Stale or risky for current docs:

- the file is outdated in places;
- old timeline and React examples should not be copied as current API guidance;
- current runtime behavior should be checked against source, tests, and the
  advanced overview.

### Historical debug description architecture

[packages/universal/debug/src/description/README.md](https://github.com/starbeamjs/starbeam/blob/main/packages/universal/debug/src/description/README.md)
records early thinking about debug descriptions.

Still useful for:

- understanding old debug-design goals;
- tracing why description metadata exists.

Stale or risky for current docs:

- it describes early and internal architecture;
- contemplated APIs in that note should not be presented as current public APIs.

## Not an archive dump

Not every unfinished or old-looking file belongs here. One-line construction
stubs and obsolete redirect files are not useful archive material. Experimental
packages belong in [Experiments](/experiments/overview/) once they have public
docs.

## Next steps

- [Advanced and implementor docs](/advanced/overview/): current implementor
  orientation.
- [Reference](/reference/overview/): public package surface.
- [Experiments](/experiments/overview/): experimental packages and prototypes.
