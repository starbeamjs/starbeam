# `@starbeam/interfaces`

`@starbeam/interfaces` is a type-only protocol substrate for Starbeam packages
and implementors.

It contains shared TypeScript interfaces for runtime coordination, reactive
values, tags, debug descriptions, timestamps, and subscription callbacks. These
types let Starbeam's packages agree on protocol shapes without introducing
runtime dependency cycles.

This package is not the normal app-author API. App authors should usually import
from a framework adapter, `@starbeam/universal`, or a more specific package such
as `@starbeam/reactive` or `@starbeam/resource`.

The current package name and export shape are compatibility surface. A later
Prepare / Execute / Review (PER) cycle may decide whether a clearer
`@starbeam/protocol` package should own these types.
